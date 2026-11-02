import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/tours";
import { PACKS, SIZES, usd as fmtUsd, type PackKey, type SizeKey } from "@/lib/tourPricing";

// Ventas de Tours 360 y lo que dejan por mes: lo cobrado al inicio, las cuotas de suscripción que
// corren, tus costos de tiempo y traslado, y la parte de los costos fijos. Con eso dice si el mes ya
// cubre los costos y cuánto margen queda para dar descuentos.

export interface Sale {
  id: string;
  sale_date: string;
  client_name: string;
  pack: PackKey | null;
  size: SizeKey | null;
  pay: "unico" | "suscripcion";
  qty: number;
  amount_usd: number;
  monthly_usd: number;
  months: number;
  cost_usd: number;
  status: "activa" | "cancelada";
  quote_id: string | null;
  notes: string | null;
}

export type SaleDraft = Omit<Sale, "id">;

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const monthKey = (d: string) => d.slice(0, 7); // AAAA-MM
const monthIndex = (k: string) => Number(k.slice(0, 4)) * 12 + Number(k.slice(5, 7)) - 1;
const monthName = (k: string) => `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;
const addMonths = (k: string, n: number) => { const i = monthIndex(k) + n; return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`; };

/** Lo que una venta aporta en un mes: pago inicial (su mes) y cuota (los meses siguientes) */
function saleInMonth(s: Sale, k: string) {
  const diff = monthIndex(k) - monthIndex(monthKey(s.sale_date));
  const upfront = diff === 0 ? Number(s.amount_usd) : 0;
  const cost = diff === 0 ? Number(s.cost_usd) : 0;
  const monthly = s.pay === "suscripcion" && s.status === "activa" && diff >= 1 && diff <= s.months ? Number(s.monthly_usd) : 0;
  return { upfront, monthly, cost };
}

export function monthSummary(sales: Sale[], k: string, fixed: number) {
  let upfront = 0, monthly = 0, cost = 0, count = 0, subs = 0;
  for (const s of sales) {
    const m = saleInMonth(s, k);
    upfront += m.upfront; monthly += m.monthly; cost += m.cost;
    if (m.upfront > 0 || monthKey(s.sale_date) === k) count++;
    if (m.monthly > 0) subs++;
  }
  const income = upfront + monthly;
  const profit = income - cost - fixed;
  return { upfront, monthly, income, cost, fixed, profit, margin: income > 0 ? profit / income : 0, count, subs };
}

const inputCls = "rounded-md border border-gray-200 bg-white px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#F0A030]/50";

export function SalesPanel({ fixedToday, fixedFull, money, refPrice, refVariable, minPct, draft, onDraftUsed, onSaved }: {
  fixedToday: number; // costos fijos de Tours al mes con lo que pagas hoy
  fixedFull: number; // con todos los planes activos
  money: (n: number) => string;
  refPrice: number; // Plus mediano, para traducir el margen a un % de descuento
  refVariable: number; // su costo de tiempo y traslado
  minPct: number;
  draft: SaleDraft | null; // una venta propuesta desde la calculadora o una cotización
  onDraftUsed: () => void;
  onSaved?: (s: Sale) => void; // para ligar la venta al prospecto
}) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/Santo_Domingo" }).slice(0, 7));
  const [allPlans, setAllPlans] = useState(false);
  const [form, setForm] = useState<SaleDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await db.from("tour_sales").select("*").order("sale_date", { ascending: false });
      if (error) toast({ title: "Error al cargar las ventas", description: error.message, variant: "destructive" });
      setSales(data ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (draft) {
      setForm(draft);
      setMonth(monthKey(draft.sale_date));
      onDraftUsed();
      setTimeout(() => document.getElementById("ventas")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, [draft, onDraftUsed]);

  const fixed = allPlans ? fixedFull : fixedToday;
  const sum = useMemo(() => monthSummary(sales, month, fixed), [sales, month, fixed]);
  const history = useMemo(() => Array.from({ length: 6 }, (_, i) => addMonths(month, -5 + i)).map((k) => ({ k, ...monthSummary(sales, k, fixed) })), [sales, month, fixed]);
  const inMonth = sales.filter((s) => monthKey(s.sale_date) === month);
  const runningSubs = sales.filter((s) => monthKey(s.sale_date) !== month && saleInMonth(s, month).monthly > 0);

  // Margen para descuentos: lo que sobra este mes, traducido a % de una venta Plus mediana
  const covered = sum.income - sum.cost;
  const surplus = sum.profit;
  const maxByCost = refPrice > 0 ? (1 - refVariable / refPrice) * 100 : 0;
  const roomPct = refPrice > 0 ? Math.max(0, Math.min(maxByCost, (surplus / refPrice) * 100 + minPct)) : 0;
  const salesToCover = refPrice - refVariable > 0 ? Math.ceil(Math.max(0, -surplus) / (refPrice - refVariable)) : 0;

  async function saveForm() {
    if (!form) return;
    setSaving(true);
    const row = { ...form, client_name: form.client_name.trim(), notes: form.notes?.trim() || null };
    const { data, error } = await db.from("tour_sales").insert(row).select().single();
    setSaving(false);
    if (error) return toast({ title: "No se pudo guardar la venta", description: error.message, variant: "destructive" });
    setSales((l) => [data, ...l].sort((a, b) => b.sale_date.localeCompare(a.sale_date)));
    setForm(null);
    setMonth(monthKey(data.sale_date));
    toast({ title: "Venta registrada" });
    onSaved?.(data);
  }

  async function patch(s: Sale, changes: Partial<Sale>) {
    const { data, error } = await db.from("tour_sales").update(changes).eq("id", s.id).select().single();
    if (error) return toast({ title: "No se pudo actualizar", description: error.message, variant: "destructive" });
    setSales((l) => l.map((x) => (x.id === s.id ? data : x)));
  }

  async function remove(s: Sale) {
    if (!window.confirm(`¿Borrar la venta de ${s.client_name || "este cliente"}?`)) return;
    const { error } = await db.from("tour_sales").delete().eq("id", s.id);
    if (error) return toast({ title: "No se pudo borrar", description: error.message, variant: "destructive" });
    setSales((l) => l.filter((x) => x.id !== s.id));
  }

  const setF = <K extends keyof SaleDraft>(k: K, v: SaleDraft[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const blank = (): SaleDraft => ({ sale_date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Santo_Domingo" }), client_name: "", pack: "p", size: "m", pay: "unico", qty: 1, amount_usd: 0, monthly_usd: 0, months: 12, cost_usd: Math.round(refVariable), status: "activa", quote_id: null, notes: null });

  const describe = (s: Sale) => [s.pack ? PACKS.find((x) => x.key === s.pack)?.name : null, s.size ? SIZES.find((x) => x.key === s.size)?.name.toLowerCase() : null, s.qty > 1 ? `×${s.qty}` : null].filter(Boolean).join(" · ");

  return (
    <section id="ventas" className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-4 scroll-mt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#0F2B4C]">Ventas y ganancias del mes</h2>
          <p className="text-xs text-gray-500 mt-0.5 max-w-3xl">Registra cada venta cerrada. Con eso ves cuánto entró, cuánto te costó, si el mes ya cubre los costos fijos y cuánto margen tienes para dar descuentos. Los montos van sin ITBIS.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Mes" className={inputCls} />
          <Button onClick={() => setForm(blank())} variant="outline"><Plus size={15} /> Registrar venta</Button>
        </div>
      </div>

      {form && (
        <div className="rounded-xl border-2 border-[#F0A030] bg-[#FCEBD0]/40 p-3 space-y-3">
          <div className="flex items-center justify-between"><p className="font-semibold text-[#0F2B4C]">Nueva venta</p><button type="button" onClick={() => setForm(null)} aria-label="Cancelar" className="p-1 text-gray-500 hover:text-gray-800"><X size={16} /></button></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <label className="flex flex-col gap-1"><span className="text-[11px] text-gray-500">Fecha</span><input type="date" className={inputCls} value={form.sale_date} onChange={(e) => setF("sale_date", e.target.value)} /></label>
            <label className="flex flex-col gap-1 lg:col-span-2"><span className="text-[11px] text-gray-500">Cliente</span><input className={inputCls} value={form.client_name} onChange={(e) => setF("client_name", e.target.value)} placeholder="Nombre o empresa" /></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] text-gray-500">Forma de pago</span>
              <select className={inputCls} value={form.pay} onChange={(e) => setF("pay", e.target.value as Sale["pay"])}><option value="unico">Pago único</option><option value="suscripcion">Suscripción</option></select></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] text-gray-500">Paquete</span>
              <select className={inputCls} value={form.pack ?? ""} onChange={(e) => setF("pack", (e.target.value || null) as PackKey | null)}><option value="">—</option>{PACKS.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</select></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] text-gray-500">Tamaño</span>
              <select className={inputCls} value={form.size ?? ""} onChange={(e) => setF("size", (e.target.value || null) as SizeKey | null)}><option value="">—</option>{SIZES.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</select></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] text-gray-500">Propiedades</span><input type="number" min={1} className={inputCls} value={form.qty} onChange={(e) => setF("qty", Math.max(1, Number(e.target.value) || 1))} /></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] text-gray-500">Cobrado al inicio (US$, sin ITBIS)</span><input type="number" step="0.01" className={inputCls} value={form.amount_usd} onChange={(e) => setF("amount_usd", Number(e.target.value) || 0)} /></label>
            {form.pay === "suscripcion" && <>
              <label className="flex flex-col gap-1"><span className="text-[11px] text-gray-500">Cuota al mes (US$)</span><input type="number" step="0.01" className={inputCls} value={form.monthly_usd} onChange={(e) => setF("monthly_usd", Number(e.target.value) || 0)} /></label>
              <label className="flex flex-col gap-1"><span className="text-[11px] text-gray-500">Meses de suscripción</span><input type="number" min={1} className={inputCls} value={form.months} onChange={(e) => setF("months", Math.max(1, Number(e.target.value) || 1))} /></label>
            </>}
            <label className="flex flex-col gap-1"><span className="text-[11px] text-gray-500">Tu costo: tiempo y traslado (US$)</span><input type="number" step="0.01" className={inputCls} value={form.cost_usd} onChange={(e) => setF("cost_usd", Number(e.target.value) || 0)} /></label>
            <label className="flex flex-col gap-1 sm:col-span-2"><span className="text-[11px] text-gray-500">Nota</span><input className={inputCls} value={form.notes ?? ""} onChange={(e) => setF("notes", e.target.value)} placeholder="Opcional" /></label>
          </div>
          <Button onClick={saveForm} disabled={saving} className="bg-[#0F2B4C] hover:bg-[#173a63]">{saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} Guardar venta</Button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 flex items-center gap-2"><Loader2 className="animate-spin" size={15} /> Cargando ventas…</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-[#0F2B4C] capitalize">{monthName(month)}</p>
            <label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={allPlans} onChange={(e) => setAllPlans(e.target.checked)} className="accent-[#F0A030]" /> Contar todos los planes activos (Vercel y Supabase incluidos)</label>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 tabular-nums">
            <div className="rounded-xl bg-[#eef3f9] p-3"><p className="text-[11px] text-gray-500">Ingresos ({sum.count} venta{sum.count === 1 ? "" : "s"}{sum.subs ? ` + ${sum.subs} cuota${sum.subs === 1 ? "" : "s"}` : ""})</p><p className="text-lg font-bold text-[#0F2B4C]">{money(sum.income)}</p></div>
            <div className="rounded-xl bg-[#eef3f9] p-3"><p className="text-[11px] text-gray-500">Tu tiempo y traslados</p><p className="text-lg font-bold text-[#0F2B4C]">−{money(sum.cost)}</p></div>
            <div className="rounded-xl bg-[#eef3f9] p-3"><p className="text-[11px] text-gray-500">Costos fijos de Tours</p><p className="text-lg font-bold text-[#0F2B4C]">−{money(sum.fixed)}</p></div>
            <div className={cn("rounded-xl p-3", sum.profit >= 0 ? "bg-emerald-50" : "bg-red-50")}><p className="text-[11px] text-gray-500">Ganancia</p><p className={cn("text-lg font-bold", sum.profit >= 0 ? "text-emerald-700" : "text-red-600")}>{sum.profit < 0 ? "−" : ""}{money(Math.abs(sum.profit))}</p></div>
            <div className="rounded-xl bg-[#eef3f9] p-3"><p className="text-[11px] text-gray-500">Margen</p><p className="text-lg font-bold text-[#0F2B4C]">{sum.income > 0 ? `${Math.round(sum.margin * 100)}%` : "—"}</p></div>
          </div>

          {sum.fixed > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500"><span>Costos fijos cubiertos</span><span className="tabular-nums">{Math.max(0, Math.round((covered / sum.fixed) * 100))}%</span></div>
              <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden"><div className={cn("h-full rounded-full", covered >= sum.fixed ? "bg-emerald-500" : "bg-[#F0A030]")} style={{ width: `${Math.min(100, Math.max(0, (covered / sum.fixed) * 100))}%` }} /></div>
            </div>
          )}

          <div className={cn("rounded-xl border p-3 flex gap-3 items-start", surplus >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900")}>
            {surplus >= 0 ? <TrendingUp size={18} className="shrink-0 mt-0.5" /> : <TrendingDown size={18} className="shrink-0 mt-0.5" />}
            {surplus >= 0 ? (
              <p>Este mes ya cubriste tus costos y te sobran <b>{money(surplus)}</b>. En la próxima venta Plus mediana podrías dar hasta <b>{Math.floor(roomPct)}% de descuento</b>: tu {minPct}% normal más lo que ya te sobra este mes. Úsalo para cerrar, no por costumbre.</p>
            ) : (
              <p>Te faltan <b>{money(-surplus)}</b> para cubrir los costos de este mes{salesToCover > 0 ? <> (unas <b>{salesToCover} venta{salesToCover === 1 ? "" : "s"} Plus mediana{salesToCover === 1 ? "" : "s"}</b>)</> : null}. Mientras tanto, no bajes más del {minPct}% de tu lista.</p>
            )}
          </div>

          {/* Ventas del mes y suscripciones que corren */}
          {inMonth.length + runningSubs.length === 0 ? (
            <p className="text-gray-500">No hay ventas en {monthName(month)}. Usa “Registrar venta”, “Registrar como venta” en la calculadora o “Venta” en una cotización.</p>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[680px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-gray-500"><th className="py-2">Fecha</th><th className="py-2">Cliente</th><th className="py-2">Detalle</th><th className="py-2 text-right">Este mes</th><th className="py-2 text-right">Tu costo</th><th className="py-2 pl-3">Estado</th><th /></tr></thead>
                <tbody>
                  {[...inMonth, ...runningSubs].map((s) => {
                    const m = saleInMonth(s, month);
                    return (
                      <tr key={s.id} className={cn("border-t border-gray-100", s.status === "cancelada" && "opacity-50")}>
                        <td className="py-2 whitespace-nowrap text-gray-600">{new Date(s.sale_date + "T12:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short" })}</td>
                        <td className="py-2">{s.client_name || <span className="text-gray-400">Sin nombre</span>}</td>
                        <td className="py-2 text-gray-600">{describe(s) || "—"}{s.pay === "suscripcion" && <span className="ml-1 text-xs text-[#9A5F10]">suscripción {fmtUsd(Number(s.monthly_usd))}/mes · {s.months} meses</span>}</td>
                        <td className="py-2 text-right tabular-nums font-semibold text-[#0F2B4C]">{money(m.upfront + m.monthly)}{m.monthly > 0 && m.upfront === 0 && <span className="block text-[11px] font-normal text-gray-500">cuota</span>}</td>
                        <td className="py-2 text-right tabular-nums text-gray-600">{m.cost ? `−${fmtUsd(m.cost)}` : "—"}</td>
                        <td className="py-2 pl-3">
                          {s.pay === "suscripcion" ? (
                            <select value={s.status} onChange={(e) => patch(s, { status: e.target.value as Sale["status"] })} aria-label="Estado de la suscripción" className={cn("rounded-full px-2.5 py-1 text-xs font-semibold border-0 outline-none", s.status === "activa" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                              <option value="activa">Activa</option><option value="cancelada">Cancelada</option>
                            </select>
                          ) : <span className="text-xs text-gray-500">Pagada</span>}
                        </td>
                        <td className="py-2 text-right"><button type="button" onClick={() => remove(s)} className="p-1.5 text-gray-400 hover:text-red-500" aria-label="Borrar venta"><Trash2 size={14} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Últimos 6 meses */}
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[520px] text-xs">
              <thead><tr className="text-left uppercase tracking-wider text-gray-500"><th className="py-1.5">Mes</th><th className="py-1.5 text-right">Ventas</th><th className="py-1.5 text-right">Ingresos</th><th className="py-1.5 text-right">Costos</th><th className="py-1.5 text-right">Ganancia</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.k} className={cn("border-t border-gray-100 tabular-nums", h.k === month && "bg-[#FCEBD0]/50 font-semibold")}>
                    <td className="py-1.5 capitalize"><button type="button" onClick={() => setMonth(h.k)} className="hover:underline">{monthName(h.k)}</button></td>
                    <td className="py-1.5 text-right">{h.count}</td>
                    <td className="py-1.5 text-right">{fmtUsd(h.income)}</td>
                    <td className="py-1.5 text-right">−{fmtUsd(h.cost + h.fixed)}</td>
                    <td className={cn("py-1.5 text-right", h.profit >= 0 ? "text-emerald-700" : "text-red-600")}>{h.profit < 0 ? "−" : ""}{fmtUsd(Math.abs(h.profit))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
