import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Plus, Receipt, Rotate3d, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usd } from "@/lib/tourPricing";
import {
  EXPENSE_CATEGORIES, deleteExpense, inRange, label, loadExpenses, loadRate, loadTourVisits, prospectIncome, saleIncomeIn, saveExpense, toUsd, todayDR, tourIncome,
  type Expense, type ExpenseCategory, type ExpenseDraft, type Linkables, type Prospect, type Range, type TourVisits,
} from "@/lib/tourProspects";

// Dinero de Tours 360: gastos (papel, tinta, comisiones, alianzas…), ingresos de las ventas, y si cada
// alianza o gasto valió la pena. También las visitas de cada tour contra lo que pagó su cliente.

/** Ventana de "visitas recientes" por tour */
const VISIT_DAYS = 30;

type RangeKey = "mes" | "mes_pasado" | "anio" | "todo";

function rangeOf(k: RangeKey, today = todayDR()): Range {
  const y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7));
  const iso = (yy: number, mm: number, dd: number) => `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  const last = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  if (k === "mes") return { from: iso(y, m, 1), to: today };
  if (k === "mes_pasado") { const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1; return { from: iso(py, pm, 1), to: iso(py, pm, last(py, pm)) }; }
  if (k === "anio") return { from: iso(y, 1, 1), to: today };
  return { from: null, to: today }; // lo cobrado hasta hoy (sin cuotas futuras)
}

function fail(title: string, e: unknown) {
  console.error(title, e);
  toast({ title, description: (e as { message?: string })?.message ?? String(e), variant: "destructive" });
}

const fmtDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("es-DO", { day: "numeric", month: "short" });
/** US$ con signo de menos delante: −US$25 */
const money = (n: number) => (n < 0 ? `−${usd(-n)}` : usd(n));
const usd2 = (n: number) => `US$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Stat({ label: name, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{name}</p>
      <p className={cn("text-xl font-bold tabular-nums", tone === "good" ? "text-green-700" : tone === "bad" ? "text-red-600" : "text-[#0F2B4C]")}>{value}</p>
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

function Section({ icon: Icon, title, desc, action, children }: { icon: typeof Receipt; title: string; desc?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-bold text-[#0F2B4C] flex items-center gap-1.5"><Icon size={16} /> {title}</h2>
          {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ProspectMoney({ prospects, links }: { prospects: Prospect[]; links: Linkables }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [visits, setVisits] = useState<Map<string, TourVisits>>(new Map());
  const [rate, setRate] = useState(60);
  const [loading, setLoading] = useState(true);
  const [rangeKey, setRangeKey] = useState<RangeKey>("mes");
  const [editing, setEditing] = useState<ExpenseDraft | null>(null);

  useEffect(() => {
    Promise.all([loadExpenses(), loadTourVisits(VISIT_DAYS), loadRate()])
      .then(([e, v, r]) => { setExpenses(e); setVisits(v); setRate(r); })
      .catch((e) => fail("Error al cargar el dinero de Tours", e))
      .finally(() => setLoading(false));
  }, []);

  const range = rangeOf(rangeKey);
  const byId = useMemo(() => new Map(prospects.map((p) => [p.id, p])), [prospects]);

  const totals = useMemo(() => {
    const exp = expenses.filter((e) => inRange(e.spent_on, range));
    const income = links.sales.reduce((a, s) => a + saleIncomeIn(s, range), 0);
    const saleCost = links.sales.filter((s) => s.status !== "cancelada" && inRange(s.sale_date, range)).reduce((a, s) => a + s.cost_usd, 0);
    const spent = exp.reduce((a, e) => a + e.amount_usd, 0);
    const byCat = EXPENSE_CATEGORIES.map((c) => ({ ...c, usd: exp.filter((e) => e.category === c.key).reduce((a, e) => a + e.amount_usd, 0) })).filter((c) => c.usd > 0);
    return { exp, income, saleCost, spent, result: income - spent - saleCost, byCat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, links.sales, range.from, range.to]);

  // ¿Valió la pena? Cada persona con gastos ligados (alianzas, comisiones…) o tipo Alianza
  const worth = useMemo(() => {
    const ids = new Set([...expenses.filter((e) => e.prospect_id).map((e) => e.prospect_id!), ...prospects.filter((p) => p.kind === "alianza").map((p) => p.id)]);
    return [...ids].map((id) => {
      const p = byId.get(id);
      const spent = expenses.filter((e) => e.prospect_id === id).reduce((a, e) => a + e.amount_usd, 0);
      const own = prospectIncome(id, links);
      const referred = prospects.filter((x) => x.referred_by_id === id);
      const fromReferred = referred.reduce((a, x) => a + prospectIncome(x.id, links), 0);
      const tours = links.tours.filter((t) => t.prospect_id === id);
      const tourVisits = tours.reduce((a, t) => a + (visits.get(t.id)?.visits ?? 0), 0);
      return { id, p, spent, own, fromReferred, referred: referred.length, tours: tours.length, tourVisits, net: own + fromReferred - spent };
    }).filter((x) => x.p).sort((a, b) => b.spent - a.spent);
  }, [expenses, prospects, links, visits, byId]);

  // Visitas por tour contra lo que pagó su cliente
  const tourRows = useMemo(() => links.tours.map((t) => {
    const v = visits.get(t.id);
    const income = tourIncome(t.id, links);
    const spent = expenses.filter((e) => e.tour_id === t.id).reduce((a, e) => a + e.amount_usd, 0);
    return { t, v, income, spent, owner: t.prospect_id ? byId.get(t.prospect_id) : undefined, perVisit: income && v?.visits ? income / v.visits : null };
  }).sort((a, b) => Number(b.t.published) - Number(a.t.published) || (b.v?.visits ?? 0) - (a.v?.visits ?? 0)), [links, visits, expenses, byId]);

  async function remove(e: Expense) {
    if (!confirm(`¿Borrar el gasto «${e.description || label(EXPENSE_CATEGORIES, e.category)}»?`)) return;
    try {
      await deleteExpense(e.id);
      setExpenses((l) => l.filter((x) => x.id !== e.id));
    } catch (err) { fail("No se pudo borrar", err); }
  }

  if (loading) return <p className="text-gray-500 flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Cargando…</p>;

  const RANGES: [RangeKey, string][] = [["mes", "Este mes"], ["mes_pasado", "Mes pasado"], ["anio", "Este año"], ["todo", "Todo"]];
  const maxCat = Math.max(1, ...totals.byCat.map((c) => c.usd));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
        {RANGES.map(([k, name]) => (
          <button key={k} onClick={() => setRangeKey(k)}
            className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold", rangeKey === k ? "bg-[#0F2B4C] text-white border-[#0F2B4C]" : "bg-white border-gray-200 text-[#0F2B4C]")}>
            {name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Stat label="Ingresos" value={usd(totals.income)} hint="Ventas de Tours (pagos y cuotas)" />
        <Stat label="Gastos" value={usd(totals.spent)} hint={`${totals.exp.length} ${totals.exp.length === 1 ? "gasto" : "gastos"} anotados`} />
        <Stat label="Costo de las ventas" value={usd(totals.saleCost)} hint="Tu tiempo y traslados (de Precios)" />
        <Stat label="Resultado" value={money(totals.result)} tone={totals.result >= 0 ? "good" : "bad"} hint="Ingresos − gastos − costo" />
      </div>

      <Section icon={Receipt} title="Gastos" desc="Papel, tinta, comisiones, alianzas… Se anotan en RD$ o US$ y se suman en dólares."
        action={<Button size="sm" className="bg-[#0F2B4C] hover:bg-[#173a63]" onClick={() => setEditing({ spent_on: todayDR(), category: "impresion", description: "", amount: 0, currency: "rd", rate, prospect_id: null, tour_id: null, notes: null })}><Plus size={14} className="mr-1" /> Gasto</Button>}>
        {totals.byCat.length > 0 && (
          <div className="space-y-1">
            {totals.byCat.map((c) => (
              <div key={c.key} className="grid grid-cols-[110px_1fr_70px] sm:grid-cols-[180px_1fr_80px] items-center gap-2 text-xs">
                <span className="truncate text-gray-600">{c.label}</span>
                <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-[#F0A030]" style={{ width: `${(c.usd / maxCat) * 100}%` }} /></div>
                <span className="text-right tabular-nums font-semibold">{usd(c.usd)}</span>
              </div>
            ))}
          </div>
        )}
        {totals.exp.length ? (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {totals.exp.map((e) => (
              <li key={e.id}>
                <button className="w-full text-left px-3 py-2 flex items-center gap-2" onClick={() => setEditing({ ...e })}>
                  <span className="text-xs text-gray-400 w-12 shrink-0">{fmtDate(e.spent_on)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm truncate">{e.description || label(EXPENSE_CATEGORIES, e.category)}</span>
                    <span className="block text-[11px] text-gray-500 truncate">
                      {[label(EXPENSE_CATEGORIES, e.category), e.prospect_id ? byId.get(e.prospect_id)?.name : null, e.tour_id ? links.tours.find((t) => t.id === e.tour_id)?.title : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block font-semibold tabular-nums">{usd2(e.amount_usd)}</span>
                    {e.currency === "rd" && <span className="block text-[11px] text-gray-400 tabular-nums">RD${e.amount.toLocaleString("en-US")}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-gray-400">Sin gastos en este periodo.</p>}
      </Section>

      <Section icon={Scale} title="¿Valió la pena?" desc="Por cada alianza o persona con gastos: lo que se gastó contra lo que dejó (sus ventas y las de quienes refirió) y las visitas de sus tours.">
        {worth.length ? (
          <div className="grid sm:grid-cols-2 gap-2">
            {worth.map((w) => (
              <div key={w.id} className={cn("rounded-xl border p-3 space-y-1", w.net >= 0 ? "border-green-200 bg-green-50/40" : "border-amber-200 bg-amber-50/40")}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-[#0F2B4C] truncate">{w.p!.name}</p>
                  <span className={cn("text-[11px] font-semibold rounded-full px-2 py-0.5", w.net >= 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800")}>
                    {w.net >= 0 ? "Ya se pagó" : "Todavía no"}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 text-xs">
                  <dt className="text-gray-500">Gastado</dt><dd className="text-right tabular-nums">{usd(w.spent)}</dd>
                  <dt className="text-gray-500">Sus ventas</dt><dd className="text-right tabular-nums">{usd(w.own)}</dd>
                  <dt className="text-gray-500">De sus referidos ({w.referred})</dt><dd className="text-right tabular-nums">{usd(w.fromReferred)}</dd>
                  <dt className="text-gray-500">Visitas de sus tours</dt><dd className="text-right tabular-nums">{w.tours ? w.tourVisits.toLocaleString("en-US") : "sin tour ligado"}</dd>
                  <dt className="font-semibold">Balance</dt><dd className={cn("text-right tabular-nums font-bold", w.net >= 0 ? "text-green-700" : "text-red-600")}>{money(w.net)}</dd>
                </dl>
                {w.spent > 0 && w.tourVisits > 0 && <p className="text-[11px] text-gray-500">Cada visita de sus tours costó {usd2(w.spent / w.tourVisits)}.</p>}
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-gray-400">Liga un gasto a un prospecto (o marca a alguien como Alianza) para verlo aquí.</p>}
      </Section>

      <Section icon={Eye} title="Visitas por tour" desc={`Visitas de la gente (sin las del equipo), las de los últimos ${VISIT_DAYS} días, y lo que pagó su cliente por cada visita.`}>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {tourRows.map(({ t, v, income, spent, owner, perVisit }) => (
            <div key={t.id} className="rounded-xl border border-gray-200 p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <a href={`/tour/${t.slug}`} target="_blank" rel="noreferrer" className="font-bold text-[#0F2B4C] truncate hover:text-[#b8761a] flex items-center gap-1"><Rotate3d size={13} /> {t.title}</a>
                <span className={cn("text-[11px] font-semibold rounded-full px-2 py-0.5", t.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>{t.published ? "Publicado" : "Borrador"}</span>
              </div>
              <p className="text-[11px] text-gray-500 truncate">{owner ? `Cliente: ${owner.name}` : "Sin cliente ligado (lígalo desde el prospecto)"}</p>
              <div className="grid grid-cols-3 gap-1 text-center pt-1">
                <div><p className="text-lg font-bold tabular-nums text-[#0F2B4C]">{(v?.visits ?? 0).toLocaleString("en-US")}</p><p className="text-[10px] text-gray-500">visitas</p></div>
                <div><p className="text-lg font-bold tabular-nums text-[#0F2B4C]">{(v?.visitors ?? 0).toLocaleString("en-US")}</p><p className="text-[10px] text-gray-500">personas</p></div>
                <div><p className="text-lg font-bold tabular-nums text-[#0F2B4C]">{(v?.visits_recent ?? 0).toLocaleString("en-US")}</p><p className="text-[10px] text-gray-500">últ. {VISIT_DAYS} días</p></div>
              </div>
              {income !== null && (
                <p className="text-xs text-gray-600 border-t border-gray-100 pt-1">
                  {!income ? "Su cliente aún no tiene ventas ligadas" : <>Pagó {usd(income)} · {perVisit !== null ? <><b>{usd2(perVisit)}</b> por visita</> : "aún sin visitas"}</>}
                </p>
              )}
              {spent > 0 && <p className="text-[11px] text-gray-500">Gastos ligados a este tour: {usd(spent)}</p>}
            </div>
          ))}
        </div>
        {!tourRows.length && <p className="text-xs text-gray-400">No hay tours todavía.</p>}
      </Section>

      {editing && (
        <ExpenseSheet
          draft={editing} prospects={prospects} links={links}
          onClose={() => setEditing(null)}
          onSaved={(e) => { setExpenses((l) => [e, ...l.filter((x) => x.id !== e.id)].sort((a, b) => b.spent_on.localeCompare(a.spent_on))); setEditing(null); }}
          onDelete={editing.id ? () => { const e = expenses.find((x) => x.id === editing.id); setEditing(null); if (e) remove(e); } : undefined}
        />
      )}
    </div>
  );
}

const SHEET = "top-auto bottom-0 translate-y-0 data-[state=open]:slide-in-from-top-[100%] max-h-[92dvh] overflow-y-auto rounded-t-2xl rounded-b-none p-4 sm:p-6 sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:rounded-2xl max-w-lg";

function ExpenseSheet({ draft, prospects, links, onClose, onSaved, onDelete }: {
  draft: ExpenseDraft; prospects: Prospect[]; links: Linkables; onClose: () => void; onSaved: (e: Expense) => void; onDelete?: () => void;
}) {
  const [d, setD] = useState<ExpenseDraft>(draft);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ExpenseDraft>(k: K, v: ExpenseDraft[K]) => setD((o) => ({ ...o, [k]: v }));
  const inUsd = toUsd(d.amount || 0, d.currency, d.rate);

  async function save() {
    if (!(d.amount > 0)) return toast({ title: "Falta el monto", variant: "destructive" });
    setSaving(true);
    try {
      onSaved(await saveExpense({ ...d, description: d.description.trim() }));
      toast({ title: draft.id ? "Gasto guardado" : "Gasto anotado" });
    } catch (e) { fail("No se pudo guardar el gasto", e); }
    setSaving(false);
  }

  const lbl = "text-[11px] font-bold uppercase tracking-wider text-gray-500";
  const sel = "h-10 w-full rounded-md border border-input bg-background px-2 text-sm";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={SHEET} onOpenAutoFocus={(e) => draft.id && e.preventDefault()}>
        <DialogTitle className="text-lg font-bold text-[#0F2B4C] pr-8">{draft.id ? "Gasto" : "Nuevo gasto"}</DialogTitle>
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-1.5">
            {EXPENSE_CATEGORIES.map((c) => (
              <button key={c.key} type="button" onClick={() => set("category", c.key as ExpenseCategory)}
                className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", d.category === c.key ? "border-[#F0A030] bg-[#FCEBD0] text-[#0F2B4C]" : "border-gray-200 bg-white text-gray-600")}>
                {c.label}
              </button>
            ))}
          </div>
          <label className="block space-y-1"><span className={lbl}>Qué fue</span>
            <Input value={d.description} onChange={(e) => set("description", e.target.value)} placeholder="Ej.: Papel mate 200 g, comisión a Juan" autoFocus={!draft.id} /></label>
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <label className="block space-y-1"><span className={lbl}>Monto</span>
              <Input type="number" inputMode="decimal" min={0} value={d.amount || ""} onChange={(e) => set("amount", Number(e.target.value) || 0)} /></label>
            <div className="flex rounded-md border border-gray-200 bg-white p-0.5 h-10" role="group" aria-label="Moneda">
              {(["rd", "usd"] as const).map((k) => (
                <button key={k} type="button" onClick={() => set("currency", k)} className={cn("px-3 rounded text-xs font-semibold", d.currency === k ? "bg-[#0F2B4C] text-white" : "text-[#0F2B4C]")}>{k === "rd" ? "RD$" : "US$"}</button>
              ))}
            </div>
          </div>
          {d.currency === "rd" && (
            <label className="flex items-center gap-2 text-xs text-gray-600">Tasa RD$ por US$1
              <Input type="number" inputMode="decimal" className="h-8 w-24" value={d.rate} onChange={(e) => set("rate", Number(e.target.value) || 0)} />
              <span>= <b>{usd2(inUsd)}</b></span>
            </label>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1"><span className={lbl}>Fecha</span>
              <Input type="date" value={d.spent_on} onChange={(e) => set("spent_on", e.target.value || todayDR())} /></label>
            <label className="block space-y-1"><span className={lbl}>Para quién</span>
              <select value={d.prospect_id ?? ""} onChange={(e) => set("prospect_id", e.target.value || null)} className={sel}>
                <option value="">General</option>
                {prospects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.kind === "alianza" ? " (alianza)" : ""}</option>)}
              </select></label>
          </div>
          <label className="block space-y-1"><span className={lbl}>Tour (opcional)</span>
            <select value={d.tour_id ?? ""} onChange={(e) => set("tour_id", e.target.value || null)} className={sel}>
              <option value="">Ninguno</option>
              {links.tours.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select></label>
          <label className="block space-y-1"><span className={lbl}>Notas</span>
            <Textarea rows={2} value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} /></label>
          <div className="flex gap-2 pt-1">
            {onDelete && <Button type="button" variant="outline" size="sm" className="text-red-600" onClick={onDelete}><Trash2 size={14} /></Button>}
            <div className="flex-1" />
            <Button type="button" size="sm" className="bg-[#0F2B4C] hover:bg-[#173a63] px-5" onClick={save} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-1.5" />} Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
