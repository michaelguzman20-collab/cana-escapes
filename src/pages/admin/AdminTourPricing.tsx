import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BadgeDollarSign, Calculator, Copy, FilePlus2, FileText, Loader2, Plus, RotateCcw, Save, Trash2, TrendingUp } from "lucide-react";
import { QuoteDialog, type QuoteStatus, type SavedQuote } from "@/components/tours/QuoteDialog";
import { SalesPanel, type SaleDraft } from "@/components/tours/SalesPanel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/tours";
import {
  DEFAULT_PRICING, NO_DISCOUNT, PACKS, SIZES, budgetAdvice, fixedCosts, hasBank, linesFromQuote, mergeDoc, mergePricing, quote, quoteNumber, round5, usd as fmtUsd, rd as fmtRd,
  type FixedCost, type PackKey, type Pricing, type QuoteDoc, type QuoteInput, type SizeKey,
} from "@/lib/tourPricing";

const QUOTE_STATUS: Record<QuoteStatus, { label: string; cls: string }> = {
  borrador: { label: "Borrador", cls: "bg-gray-100 text-gray-600" },
  enviada: { label: "Enviada", cls: "bg-blue-100 text-blue-700" },
  aceptada: { label: "Aceptada", cls: "bg-amber-100 text-amber-800" },
  rechazada: { label: "Rechazada", cls: "bg-red-100 text-red-700" },
  facturada: { label: "Facturada", cls: "bg-green-100 text-green-700" },
};

const todayDR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Santo_Domingo" });

// Precios de Tours 360 (solo admin): calculadora para cotizar en la cita, tasa del dólar, lista de
// precios editable y los costos fijos del negocio para saber cuánto queda y cuándo pagar cada plan.

type Show = "usd" | "rd" | "both";

function fail(title: string, e: unknown) {
  console.error(title, e);
  toast({ title, description: (e as { message?: string })?.message ?? String(e), variant: "destructive" });
}

/**
 * Campo numérico corto. Mientras se escribe guarda el texto tal cual, así se puede poner punto
 * o coma decimal (62.75 o 62,75) sin que el campo lo borre; el número se manda en cuanto es válido.
 */
function Num({ value, onChange, className, prefix, suffix, label }: {
  value: number; onChange: (n: number) => void; step?: number; min?: number; className?: string; prefix?: string; suffix?: string; label: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (Number.isFinite(value) ? String(Math.round(value * 100) / 100) : "0");
  return (
    <label className={cn("inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 focus-within:ring-2 focus-within:ring-[#F0A030]/50", className)}>
      {prefix && <span className="text-gray-400 text-xs">{prefix}</span>}
      <input
        type="text" inputMode="decimal" aria-label={label}
        value={shown}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,-]/g, "");
          setDraft(raw);
          const n = Number(raw.replace(",", "."));
          if (raw === "") onChange(0);
          else if (Number.isFinite(n)) onChange(n);
        }}
        onBlur={() => setDraft(null)}
        onFocus={(e) => e.target.select()}
        className="w-full min-w-0 bg-transparent outline-none tabular-nums text-right"
      />
      {suffix && <span className="text-gray-400 text-xs">{suffix}</span>}
    </label>
  );
}

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { key: T; name: string; hint?: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-1.5">
      {options.map((o) => (
        <button
          key={o.key} type="button" onClick={() => onChange(o.key)}
          className={cn("text-left rounded-lg border px-3 py-2 transition-colors", value === o.key ? "border-[#F0A030] bg-[#FCEBD0]" : "border-gray-200 bg-white hover:border-gray-300")}
        >
          <span className="block font-semibold text-[#0F2B4C]">{o.name}</span>
          {o.hint && <span className="block text-[11px] text-gray-500 leading-tight">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

function Card({ title, desc, children, className, id }: { title: string; desc?: string; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-4", className)}>
      <div>
        <h2 className="text-base font-bold text-[#0F2B4C]">{title}</h2>
        {desc && <p className="text-xs text-gray-500 mt-0.5 max-w-3xl">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

const MARKET = [
  { t: "Fotografía inmobiliaria en RD: ~US$200 listado básico, ~US$400 hasta 500 m², ~US$600 lujo con video 4K y tour 3D", s: "Babula Shots", u: "https://inmobiliaria.babulashotsrd.com/en/real-estate-photography-prices-dominican-republic/" },
  { t: "Paquetes de fotografía y drone: ~US$220, ~US$420 y ~US$620", s: "Fotógrafo Santo Domingo", u: "https://www.fotografosantodomingo.com/es/services/real-estate-drone-photography" },
  { t: "Drone en Punta Cana desde RD$2,000 a RD$3,500 en paquetes básicos", s: "Dron.PC", u: "https://dronpc.com/" },
  { t: "Tour 360° en Punta Cana desde US$1,500 por apartamento (precio de su propia web)", s: "Surrealismo", u: "https://surrealismo.co/tour-virtual-360-punta-cana-republica-dominicana/" },
  { t: "Tour 360° hecho por fotógrafo: US$150 a US$500 por propiedad (fuera de RD)", s: "Fash", u: "https://fash.com/costs/real-estate-virtual-tour-pricing" },
  { t: "Escaneo Matterport residencial: US$350 a US$1,000; alojamiento US$20 a US$40 al mes", s: "The Future 3D", u: "https://www.thefuture3d.com/learn/matterport-cost-guide/" },
];

const PLAN_STEPS = [
  { when: "Ahora", what: "Claude (el plan que ya pagas) y el dominio. Cloudflare R2 sigue gratis." },
  { when: "Primer cliente que pague", what: "Vercel Pro (US$20): el plan gratis no permite uso comercial. Supabase Pro (US$25): sin pausas por inactividad y con copias diarias." },
  { when: "Más de 10 GB de fotos (~200 tours)", what: "Cloudflare R2 empieza a cobrar unos US$0.015 por GB al mes: centavos por tour." },
  { when: "Cuando lo justifiquen las ventas", what: "Dominio propio para las fotos (DNS en Cloudflare, gratis) y, si hace falta, subir el plan de Claude." },
];

export function AdminTourPricing() {
  const [saved, setSaved] = useState<Pricing>(DEFAULT_PRICING);
  const [p, setP] = useState<Pricing>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState<Show>("both");
  const [q, setQ] = useState<QuoteInput>({ pack: "p", size: "m", pay: "unico", urgent: false, far: false, drone: false, extraScenes: 0, qty: 1, ...NO_DISCOUNT, manualPrice: null });
  const [budget, setBudget] = useState<{ amount: number; cur: "usd" | "rd" }>({ amount: 0, cur: "usd" });

  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [editor, setEditor] = useState<{ key: number; doc: QuoteDoc; saved: SavedQuote | null } | null>(null);
  const [saleDraft, setSaleDraft] = useState<SaleDraft | null>(null);
  const clearSaleDraft = useCallback(() => setSaleDraft(null), []);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, qs] = await Promise.all([
      db.from("tour_pricing").select("data").eq("id", 1).maybeSingle(),
      db.from("tour_quotes").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (error) fail("Error al cargar los precios", error);
    if (qs.error) fail("Error al cargar las cotizaciones", qs.error);
    setQuotes(qs.data ?? []);
    const merged = mergePricing(data?.data ?? {});
    setSaved(merged);
    setP(merged);
    const first = merged.discountPresets[0];
    if (first) setQ((o) => ({ ...o, discountReason: first.name, discountPct: first.pct }));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(() => JSON.stringify(p) !== JSON.stringify(saved), [p, saved]);

  async function save() {
    setSaving(true);
    const { error } = await db.from("tour_pricing").update({ data: p, updated_at: new Date().toISOString() }).eq("id", 1);
    setSaving(false);
    if (error) return fail("No se pudieron guardar los precios", error);
    setSaved(p);
    toast({ title: "Precios guardados" });
  }

  const rate = p.rate > 0 ? p.rate : 60;
  const money = (n: number) => (show === "usd" ? fmtUsd(n) : show === "rd" ? fmtRd(n, rate) : `${fmtUsd(n)} · ${fmtRd(n, rate)}`);
  const set = <K extends keyof Pricing>(k: K, v: Pricing[K]) => setP((o) => ({ ...o, [k]: v }));
  const setQi = <K extends keyof QuoteInput>(k: K, v: QuoteInput[K]) => setQ((o) => ({ ...o, [k]: v }));

  const r = useMemo(() => quote(p, q), [p, q]);
  const fc = useMemo(() => fixedCosts(p), [p]);
  const isSub = q.pay === "suscripcion";

  // Punto de equilibrio con todos los planes activos: cuántos trabajos o suscripciones cubren la parte de Tours
  const refQuote = useMemo(() => quote(p, { ...q, pack: "p", size: "m", pay: "unico", urgent: false, far: false, drone: false, extraScenes: 0, qty: 1, discountOn: false, manualPrice: null }), [p, q]);

  // Según el presupuesto del cliente (por propiedad, en US$)
  const budgetUsd = budget.amount > 0 ? (budget.cur === "rd" ? budget.amount / rate : budget.amount) / Math.max(1, q.qty) : 0;
  const advice = useMemo(() => (budgetUsd > 0 ? budgetAdvice(p, q, budgetUsd) : null), [p, q, budgetUsd]);
  const packName = (k: PackKey) => PACKS.find((x) => x.key === k)!.name;

  function applyOption(pack: PackKey, pay: "unico" | "suscripcion", amount: number) {
    setQ((o) => ({ ...o, pack, pay, discountOn: false, manualPrice: amount }));
    document.getElementById("cotizar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    toast({ title: `${packName(pack)} · ${pay === "unico" ? "pago único" : "suscripción"} a ${fmtUsd(amount)}`, description: "Ya está en la calculadora. Desde ahí haces la cotización." });
  }
  const refMargin = refQuote.price - (refQuote.cost - refQuote.costLines[2].usd);
  const toursNeeded = refMargin > 0 ? Math.ceil(fc.toursFull / refMargin) : null;
  const subsNeeded = p.monthly.m > 0 ? Math.ceil(fc.toursFull / p.monthly.m) : null;

  function copyQuote() {
    const pack = PACKS.find((x) => x.key === q.pack)!.name;
    const size = SIZES.find((x) => x.key === q.size)!;
    const each = q.qty > 1 ? " por propiedad" : "";
    const lines = [
      `Tours 360° · Paquete ${pack}`,
      `Propiedad ${size.name.toLowerCase()} (${size.hint.split(" · ")[0]})`,
      isSub
        ? `Pago inicial: ${fmtUsd(r.charged)} (${fmtRd(r.charged, rate)})${each}\nLuego ${fmtUsd(r.monthly)} al mes (${fmtRd(r.monthly, rate)}), mínimo 6 meses.`
        : `Inversión: ${fmtUsd(r.charged)} (${fmtRd(r.charged, rate)})${each}. Incluye 12 meses en línea.`,
      q.qty > 1 ? `Total por ${q.qty} propiedades: ${fmtUsd(r.charged * q.qty)} (${fmtRd(r.charged * q.qty, rate)})` : "",
      "50% al reservar la visita, 50% al entregar el enlace.",
    ].filter(Boolean);
    const text = lines.join("\n");
    navigator.clipboard?.writeText(text).then(
      () => toast({ title: "Cotización copiada", description: "Pégala en WhatsApp." }),
      () => toast({ title: "No se pudo copiar", description: text }),
    );
  }

  function newQuote() {
    setEditor({
      key: Date.now(),
      saved: null,
      doc: {
        client: { name: "", company: "", taxId: "", phone: "", email: "" },
        lines: linesFromQuote(q, r),
        itbis: true,
        currency: show === "rd" ? "rd" : show === "both" ? "both" : "usd",
        rate,
        monthlyNote: isSub ? `Luego ${fmtUsd(r.monthly)} al mes${q.qty > 1 ? " por propiedad" : ""}, mínimo 6 meses (incluye reporte de visitas, cambios y una visita al año para fotos nuevas).` : "",
        conditions: p.quoteConditions,
        validityDays: p.quoteValidityDays,
        includeBank: hasBank(p),
        date: todayDR(),
      },
    });
  }

  function saleFromCalculator() {
    const variable = r.cost - r.costLines[2].usd; // sin la parte de los costos fijos: esa se cuenta por mes
    setSaleDraft({
      sale_date: todayDR(), client_name: "", pack: q.pack, size: q.size, pay: q.pay, qty: q.qty,
      amount_usd: Math.round(r.charged * q.qty * 100) / 100,
      monthly_usd: isSub ? r.monthly * q.qty : 0, months: 12,
      cost_usd: Math.round(variable * q.qty * 100) / 100,
      status: "activa", quote_id: null, notes: r.discountLabel ? `Descuento: ${r.discountLabel}` : null,
    });
  }

  function saleFromQuote(sq: SavedQuote) {
    const doc = mergeDoc(sq.data);
    const subtotal = doc.lines.reduce((s2, l) => s2 + (Number(l.qty) || 0) * (Number(l.unit) || 0), 0);
    setSaleDraft({
      sale_date: todayDR(), client_name: doc.client.company.trim() || doc.client.name.trim(), pack: null, size: null,
      pay: doc.monthlyNote.trim() ? "suscripcion" : "unico", qty: 1,
      amount_usd: Math.round(subtotal * 100) / 100, monthly_usd: 0, months: 12,
      cost_usd: Math.round((refQuote.cost - refQuote.costLines[2].usd) * 100) / 100,
      status: "activa", quote_id: sq.id, notes: `Cotización ${quoteNumber(sq.number, sq.created_at)} (sin ITBIS). Revisa tu costo y, si es suscripción, la cuota.`,
    });
    if (sq.status === "borrador" || sq.status === "enviada") setQuoteStatus(sq, "aceptada");
  }

  function onQuoteSaved(sq: SavedQuote) {
    setQuotes((list) => [sq, ...list.filter((x) => x.id !== sq.id)].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }

  async function setQuoteStatus(sq: SavedQuote, status: QuoteStatus) {
    const { data, error } = await db.from("tour_quotes").update({ status, updated_at: new Date().toISOString() }).eq("id", sq.id).select().single();
    if (error) return fail("No se pudo cambiar el estado", error);
    onQuoteSaved(data);
  }

  async function deleteQuote(sq: SavedQuote) {
    const { error } = await db.from("tour_quotes").delete().eq("id", sq.id);
    if (error) return fail("No se pudo borrar la cotización", error);
    setQuotes((list) => list.filter((x) => x.id !== sq.id));
    toast({ title: `Cotización ${quoteNumber(sq.number, sq.created_at)} borrada` });
  }

  function setCost(i: number, patch: Partial<FixedCost>) {
    set("costs", p.costs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2" size={18} /> Cargando precios…</div>;
  }

  return (
    <div className="px-3 sm:px-6 pt-6 pb-24 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
      <div className="max-w-screen-xl mx-auto space-y-5 text-sm">
        {/* Encabezado */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link to="/admin/tours" className="p-1.5 rounded-lg hover:bg-white text-[#0F2B4C]" aria-label="Volver a Tours 360"><ArrowLeft size={18} /></Link>
            <Calculator size={20} className="text-[#0F2B4C]" />
            <div>
              <h1 className="text-xl font-bold text-[#0F2B4C]">Precios · Tours 360</h1>
              <p className="text-xs text-gray-500">Cotiza en la cita, ajusta tus precios y mira cuánto te queda después de tus costos.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white rounded-lg border border-gray-200 px-2 py-1">
              <span className="text-xs text-gray-500">Tasa RD$ por US$1</span>
              <Num label="Tasa del dólar" value={p.rate} step={0.25} onChange={(n) => set("rate", n)} className="w-20 border-0 px-1" />
            </div>
            <div className="flex rounded-lg border border-gray-200 bg-white p-0.5" role="group" aria-label="Moneda">
              {(["usd", "rd", "both"] as Show[]).map((k) => (
                <button key={k} type="button" onClick={() => setShow(k)} className={cn("px-2.5 py-1 rounded-md text-xs font-semibold", show === k ? "bg-[#0F2B4C] text-white" : "text-[#0F2B4C]")}>
                  {k === "usd" ? "US$" : k === "rd" ? "RD$" : "Ambos"}
                </button>
              ))}
            </div>
            <Button onClick={save} disabled={!dirty || saving} className="bg-[#0F2B4C] hover:bg-[#173a63]">
              {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} {dirty ? "Guardar cambios" : "Guardado"}
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-600 bg-[#FCEBD0] rounded-lg px-3 py-2 max-w-4xl">
          Los precios sugeridos salen de lo que cobran fotógrafos inmobiliarios y de drone en RD y de precios publicados de tours 360° (referencias al final). Son un punto de partida: ajústalos después de tus primeros clientes. Lo que cambies en la calculadora no se guarda; lo de las tablas se guarda con “Guardar cambios”.
        </p>

        {/* Calculadora */}
        <div className="grid lg:grid-cols-[1.25fr_1fr] gap-4 items-start">
          <Card id="cotizar" title="Cotizar" className="scroll-mt-4" desc="Elige lo que pide el cliente. En el cuadro azul tienes el precio, hasta dónde bajar y cuánto te queda.">
            <div className="space-y-1.5"><p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Paquete</p>
              <Seg value={q.pack} onChange={(v) => setQi("pack", v as PackKey)} options={PACKS} /></div>
            <div className="space-y-1.5"><p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Tamaño</p>
              <Seg value={q.size} onChange={(v) => setQi("size", v as SizeKey)} options={SIZES} /></div>
            <div className="space-y-1.5"><p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Forma de pago</p>
              <Seg value={q.pay} onChange={(v) => setQi("pay", v)} options={[{ key: "unico", name: "Pago único", hint: "Incluye 12 meses en línea" }, { key: "suscripcion", name: "Suscripción flexible", hint: "50% al inicio + mensual" }]} /></div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {([
                ["urgent", `Entrega urgente (48 h) · +${p.extras.urgentPct}%`],
                ["far", `Fuera de Bávaro, Punta Cana y Cap Cana · +${fmtUsd(p.extras.far)}`],
                ["drone", `Drone suelto (Esencial o Plus) · +${fmtUsd(p.extras.drone)}`],
              ] as [keyof QuoteInput, string][]).map(([k, label]) => (
                <label key={k} className={cn("flex items-center gap-2", k === "drone" && q.pack === "l" && "opacity-40")}>
                  <Switch checked={!!q[k]} disabled={k === "drone" && q.pack === "l"} onCheckedChange={(v) => setQi(k, v as never)} /> <span>{label}</span>
                </label>
              ))}
              <label className="flex items-center gap-2">Fotos 360° de más <Num label="Fotos 360 de más" value={q.extraScenes} onChange={(n) => setQi("extraScenes", Math.max(0, Math.round(n)))} className="w-16" /><span className="text-xs text-gray-400">{fmtUsd(p.extras.scene)} c/u</span></label>
              <label className="flex items-center gap-2">Propiedades <Num label="Cantidad de propiedades" value={q.qty} min={1} onChange={(n) => setQi("qty", Math.max(1, Math.round(n)))} className="w-16" /><span className="text-xs text-gray-400">3+: −{p.discounts.vol3}% · 6+: −{p.discounts.vol6}%</span></label>
            </div>
            <div className={cn("flex flex-wrap items-center gap-2 rounded-xl border p-2.5", q.discountOn ? "border-[#F0A030] bg-[#FCEBD0]/50" : "border-gray-200")}>
              <Switch checked={q.discountOn} onCheckedChange={(v) => setQi("discountOn", v)} aria-label="Aplicar descuento" />
              <span className="font-semibold text-[#0F2B4C]">Descuento</span>
              <input
                value={q.discountReason} onChange={(e) => setQi("discountReason", e.target.value)} aria-label="Motivo del descuento"
                placeholder="Motivo: lanzamiento, referido, cliente frecuente…"
                className="flex-1 min-w-[160px] rounded-md border border-gray-200 bg-white px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#F0A030]/50"
              />
              <Num label="Porcentaje de descuento" suffix="%" value={q.discountPct} onChange={(n) => setQi("discountPct", Math.min(100, Math.max(0, n)))} className="w-20" />
              <div className="w-full flex flex-wrap gap-1.5">
                {p.discountPresets.map((d) => {
                  const on = q.discountOn && q.discountReason === d.name && q.discountPct === d.pct;
                  return (
                    <button key={d.id} type="button" onClick={() => setQ((o) => ({ ...o, discountOn: true, discountReason: d.name, discountPct: d.pct }))}
                      className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", on ? "border-[#F0A030] bg-[#F0A030] text-[#0F2B4C]" : "border-gray-200 bg-white text-[#0F2B4C] hover:border-[#F0A030]")}>
                      {d.name} −{d.pct}%
                    </button>
                  );
                })}
              </div>
              <p className="w-full text-[11px] text-gray-500">Se aplica solo el mayor entre este y el de volumen. Sale en la cotización con su motivo.</p>
            </div>
          </Card>

          <div className="rounded-2xl bg-[#0F2B4C] text-white p-5 space-y-4 lg:sticky lg:top-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#BFD0E3]">{isSub ? "Pago inicial" : "Precio de lista"}{q.qty > 1 ? " por propiedad" : ""}{r.discountLabel ? ` · ${r.discountLabel}` : ""}</p>
              <p className="text-4xl font-serif font-bold text-[#F0A030] tabular-nums mt-1">{show === "rd" ? fmtRd(r.setup, rate) : fmtUsd(r.setup)}</p>
              {show !== "usd" && show !== "rd" && <p className="text-[#BFD0E3] tabular-nums">{fmtRd(r.setup, rate)}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/10 px-3 py-2"><p className="text-[11px] text-[#BFD0E3]">Abre con</p><p className="font-bold tabular-nums">{money(r.open)}</p></div>
              <div className="rounded-lg bg-white/10 px-3 py-2"><p className="text-[11px] text-[#BFD0E3]">No bajes de</p><p className="font-bold tabular-nums">{money(r.min)}</p></div>
            </div>
            {isSub && <p className="rounded-lg bg-[#F0A030]/15 px-3 py-2">Más <b className="text-[#F0A030]">{money(r.monthly)} al mes</b>, mínimo 6 meses. En 12 meses: {money(r.charged + r.monthly * 12)}.</p>}
            {q.qty > 1 && <p className="rounded-lg bg-white/10 px-3 py-2">Total por {q.qty} propiedades: <b>{money(r.charged * q.qty)}</b></p>}

            <div className="space-y-1 border-t border-white/15 pt-3 text-[#BFD0E3]">
              {r.lines.map((l) => <div key={l.label} className="flex justify-between gap-3 tabular-nums"><span>{l.label}</span><span>{l.usd < 0 ? "−" + fmtUsd(-l.usd) : fmtUsd(l.usd)}</span></div>)}
            </div>

            <div className="border-t border-white/15 pt-3 space-y-2">
              <label className="flex items-center justify-between gap-3">
                <span>Precio acordado{isSub ? " (pago inicial)" : ""}</span>
                <span className="flex items-center gap-1.5">
                  <Num label="Precio acordado en dólares" prefix="US$" value={q.manualPrice ?? r.setup} onChange={(n) => setQi("manualPrice", n)} className="w-28 text-[#0F2B4C]" />
                  <Num label="Precio acordado en pesos" prefix="RD$" step={100} value={Math.round((q.manualPrice ?? r.setup) * rate)} onChange={(n) => setQi("manualPrice", round5(n / rate))} className="w-32 text-[#0F2B4C]" />
                </span>
              </label>
              {q.manualPrice != null && <button type="button" onClick={() => setQi("manualPrice", null)} className="text-xs text-[#F0A030] hover:underline">Volver al precio calculado</button>}
              {r.belowMin && <p className="rounded-lg bg-red-500/20 text-red-100 px-3 py-2 text-xs">Está por debajo de tu mínimo ({fmtUsd(r.min)}). Mejor agrega algo en vez de bajar más.</p>}
            </div>

            <div className="rounded-xl bg-white/10 p-3 space-y-1.5">
              <div className="flex justify-between items-baseline gap-3">
                <span className="font-semibold">Te queda{isSub ? " al inicio" : ""}</span>
                <span className={cn("text-xl font-bold tabular-nums", r.profit >= 0 ? "text-emerald-300" : "text-red-300")}>{r.profit < 0 ? "−" : ""}{money(Math.abs(r.profit))}</span>
              </div>
              {r.costLines.map((c) => <div key={c.label} className="flex justify-between gap-3 text-xs text-[#BFD0E3] tabular-nums"><span>{c.label}</span><span>−{fmtUsd(c.usd)}</span></div>)}
              {isSub && <p className="text-xs text-[#BFD0E3]">Después, cada mes te quedan casi completos los {fmtUsd(r.monthly)} (el alojamiento de las fotos cuesta centavos).</p>}
            </div>

            <Button onClick={newQuote} className="w-full bg-[#F0A030] text-[#0F2B4C] hover:bg-[#e5952a]"><FilePlus2 size={15} /> Hacer cotización (PDF)</Button>
            <Button onClick={saleFromCalculator} variant="outline" className="w-full bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white"><BadgeDollarSign size={15} /> Registrar como venta</Button>
            <Button onClick={copyQuote} variant="outline" className="w-full bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white"><Copy size={15} /> Copiar resumen para WhatsApp</Button>
          </div>
        </div>

        {/* Según el presupuesto del cliente */}
        <Card title="Según el presupuesto del cliente" desc={`Escribe cuánto piensa pagar y te digo qué le puedes ofrecer sin que ninguno pierda: nunca baja de tu mínimo ni de tu costo. Usa el tamaño, los extras y la cantidad de propiedades de la calculadora${q.qty > 1 ? ` (el presupuesto se reparte entre las ${q.qty} propiedades)` : ""}.`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#0F2B4C]">Presupuesto{q.qty > 1 ? " total" : ""}</span>
            <Num label="Presupuesto del cliente" prefix={budget.cur === "rd" ? "RD$" : "US$"} step={budget.cur === "rd" ? 500 : 10} value={budget.amount} onChange={(n) => setBudget((b) => ({ ...b, amount: Math.max(0, n) }))} className="w-40" />
            <div className="flex rounded-lg border border-gray-200 bg-white p-0.5" role="group" aria-label="Moneda del presupuesto">
              {(["usd", "rd"] as const).map((k) => (
                <button key={k} type="button" onClick={() => setBudget((b) => ({ amount: b.amount ? (k === "rd" && b.cur === "usd" ? Math.round(b.amount * rate) : k === "usd" && b.cur === "rd" ? Math.round(b.amount / rate) : b.amount) : 0, cur: k }))}
                  className={cn("px-2.5 py-1 rounded-md text-xs font-semibold", budget.cur === k ? "bg-[#0F2B4C] text-white" : "text-[#0F2B4C]")}>{k === "usd" ? "US$" : "RD$"}</button>
              ))}
            </div>
            {budgetUsd > 0 && <span className="text-xs text-gray-500 tabular-nums">= {fmtUsd(budgetUsd)}{q.qty > 1 ? " por propiedad" : ""} · {fmtRd(budgetUsd, rate)}</span>}
          </div>

          {!advice ? (
            <p className="text-gray-500">Escribe el presupuesto para ver las opciones.</p>
          ) : (
            <div className="space-y-3">
              <div className={cn("rounded-xl p-3", advice.rec ? "bg-emerald-50 border border-emerald-200 text-emerald-900" : "bg-red-50 border border-red-200 text-red-900")}>
                {advice.rec ? (
                  <p>
                    <b>Recomendado:</b> {packName(advice.rec.pack)} en {advice.rec.pay === "unico" ? "pago único" : "suscripción"} por <b>{money(advice.rec.amount)}</b>
                    {advice.rec.pay === "suscripcion" && <> al inicio + {money(advice.rows.find((r) => r.pack === advice.rec!.pack)!.sub.monthly)} al mes</>}.
                    {advice.upgrade && <> O, con el mismo dinero, <b>{packName(advice.upgrade.pack)} en suscripción</b>: {money(advice.upgrade.amount)} al inicio + {money(advice.upgrade.monthly)} al mes.</>}
                    {advice.spare && <> Le sobran {money(advice.spare.usd)}: puedes sumarle {advice.spare.drone ? "el drone o " : ""}{advice.spare.scenes} fotos 360° de más.</>}
                    {advice.almost && (
                      <span className="block mt-1.5">
                        <b>Casi le alcanza {packName(advice.almost.pack)}</b> en pago único: le faltan solo {money(advice.almost.missing)} para tu mínimo de {money(advice.almost.amount)}. Proponle subir un poco o pagar en 2 partes.{" "}
                        <button type="button" onClick={() => applyOption(advice.almost!.pack, "unico", advice.almost!.amount)} className="font-semibold underline decoration-[#F0A030] hover:text-[#b8761a]">Usar {packName(advice.almost.pack)} a {fmtUsd(advice.almost.amount)}</button>
                      </span>
                    )}
                  </p>
                ) : (
                  <p><b>No alcanza para ningún paquete</b> sin que pierdas. Lo más cerca es Esencial en suscripción desde {money(advice.rows[2].sub.amount)} al inicio. Ofrécele menos fotos 360° o una propiedad más pequeña.</p>
                )}
              </div>

              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full min-w-[640px]">
                  <thead><tr className="text-left text-[11px] uppercase tracking-wider text-gray-500"><th className="py-2 pr-2">Paquete</th><th className="py-2 px-2">Pago único</th><th className="py-2 px-2">Suscripción</th></tr></thead>
                  <tbody>
                    {advice.rows.map((row) => {
                      const isRec = advice.rec?.pack === row.pack;
                      const cell = (kind: "unico" | "suscripcion") => {
                        const c = kind === "unico" ? row.single : row.sub;
                        const recHere = isRec && advice.rec!.pay === kind;
                        if (c.fit === "no") return <div className="text-gray-400"><p>No alcanza</p><p className="text-[11px]">Faltan {money(c.missing)} (mínimo {money(c.amount)})</p></div>;
                        return (
                          <div className={cn("rounded-lg p-2 space-y-1", recHere ? "bg-emerald-50 ring-1 ring-emerald-300" : "bg-gray-50")}>
                            <p className="font-bold text-[#0F2B4C] tabular-nums">{money(c.amount)}{kind === "suscripcion" && <span className="font-normal text-gray-600"> + {money(row.sub.monthly)}/mes</span>}</p>
                            <p className="text-[11px] text-gray-600">
                              {c.fit === "lista" ? "Precio de lista" : `Con ${c.pct}% de descuento`}
                              {kind === "unico" && c.fit === "lista" && row.single.spare > 0 && ` · le sobran ${fmtUsd(row.single.spare)}`}
                              {kind === "unico" && ` · o 2 pagos de ${fmtUsd(c.amount / 2)}`}
                              {kind === "suscripcion" && row.sub.prepay > 0 && ` · puede adelantar ${row.sub.prepay} ${row.sub.prepay === 1 ? "mes" : "meses"}`}
                            </p>
                            <p className={cn("text-[11px] font-semibold", c.profit >= 0 ? "text-emerald-700" : "text-amber-700")}>
                              {c.profit >= 0 ? `Te quedan ${fmtUsd(c.profit)}` : `Al inicio −${fmtUsd(-c.profit)}; lo recuperas en ${row.sub.recoverMonths} ${row.sub.recoverMonths === 1 ? "mes" : "meses"}`}
                            </p>
                            <button type="button" onClick={() => applyOption(row.pack, kind, kind === "suscripcion" && row.sub.prepay > 0 ? row.sub.amount : c.amount)} className="text-xs font-semibold text-[#0F2B4C] underline decoration-[#F0A030] hover:text-[#b8761a]">Usar esta opción</button>
                          </div>
                        );
                      };
                      return (
                        <tr key={row.pack} className="border-t border-gray-100 align-top">
                          <td className="py-2.5 pr-2"><b className="text-[#0F2B4C]">{packName(row.pack)}</b>{isRec && <span className="ml-1.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">Recomendado</span>}<p className="text-[11px] text-gray-500">Lista {fmtUsd(row.list)} · mín. {fmtUsd(row.floor)}</p></td>
                          <td className="py-2.5 px-2">{cell("unico")}</td>
                          <td className="py-2.5 px-2">{cell("suscripcion")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        {/* Lista de precios */}
        <Card title="Lista de precios · pago único" desc="Lo que dices primero. Incluye visita, fotos, montaje del tour y 12 meses en línea. Debajo de cada precio: tu mínimo y el equivalente en pesos.">
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[620px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-gray-500"><th className="py-2 pr-3">Tamaño</th>{PACKS.map((x) => <th key={x.key} className={cn("py-2 px-2", x.key === "p" && "bg-[#FCEBD0]/60 rounded-t-lg")}>{x.name}</th>)}</tr></thead>
              <tbody>
                {SIZES.map((s) => (
                  <tr key={s.key} className="border-t border-gray-100 align-top">
                    <td className="py-2.5 pr-3"><b className="text-[#0F2B4C]">{s.name}</b><p className="text-[11px] text-gray-500">{s.hint}</p></td>
                    {PACKS.map((x) => (
                      <td key={x.key} className={cn("py-2.5 px-2", x.key === "p" && "bg-[#FCEBD0]/60")}>
                        <Num label={`${x.name} ${s.name}`} prefix="US$" step={5} value={p.list[x.key][s.key]} onChange={(n) => set("list", { ...p.list, [x.key]: { ...p.list[x.key], [s.key]: n } })} className="w-28" />
                        <p className="text-[11px] text-gray-500 mt-1 tabular-nums">mín. {fmtUsd(round5(p.list[x.key][s.key] * (1 - p.minPct / 100)))} · {fmtRd(p.list[x.key][s.key], rate)}</p>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Suscripción flexible" desc="El cliente paga el 50% del pago único al inicio y una cuota al mes (mínimo 6 meses). Incluye reporte de visitas, cambios y una visita al año para fotos nuevas.">
            {(() => {
              const one = p.list.p.m, start = round5(one / 2), mo = p.monthly.m;
              return (
                <div className="rounded-xl bg-[#eef3f9] p-3 space-y-1.5 text-gray-700">
                  <p className="font-semibold text-[#0F2B4C]">Cómo funciona (ejemplo: Plus, propiedad mediana)</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><b>Pago único:</b> paga {fmtUsd(one)} una vez y tiene el tour 12 meses.</li>
                    <li><b>Suscripción:</b> paga {fmtUsd(start)} al inicio (el 50%) y luego {fmtUsd(mo)} cada mes. <b>El otro 50% no se cobra</b>: lo reemplaza la cuota mensual, que además le da el reporte de visitas, cambios y fotos nuevas una vez al año.</li>
                    <li>En 12 meses la suscripción te deja {fmtUsd(start + mo * 12)} contra {fmtUsd(one)} del pago único. Al cliente le conviene porque paga menos al principio; a ti, porque es un ingreso que se repite.</li>
                    <li>Si lo que quieres es cobrar el precio completo en partes (50% ahora y el resto en 2 o 3 meses), eso es un <b>pago en cuotas</b>: usa “Pago único” y escribe las cuotas en las condiciones de la cotización.</li>
                  </ul>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SIZES.map((s) => (
                <label key={s.key} className="space-y-1"><span className="text-xs text-gray-500">{s.name}</span>
                  <Num label={`Mensual ${s.name}`} prefix="US$" suffix="/mes" value={p.monthly[s.key]} onChange={(n) => set("monthly", { ...p.monthly, [s.key]: n })} /></label>
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">Luxury suma <Num label="Extra mensual Luxury" prefix="US$" value={p.luxuryMonthlyExtra} onChange={(n) => set("luxuryMonthlyExtra", n)} className="w-24" /> al mes</label>
              <label className="flex items-center gap-2">Pago único: renovar después del 1.er año <Num label="Renovación anual" prefix="US$" value={p.renewalYear} onChange={(n) => set("renewalYear", n)} className="w-24" /> al año</label>
            </div>
          </Card>

          <Card title="Extras, descuentos y margen" desc="Solo se aplica un descuento: el mayor entre el de volumen y el que elijas en la calculadora.">
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
              <label className="flex items-center justify-between gap-2">Entrega urgente <Num label="Urgente" suffix="%" value={p.extras.urgentPct} onChange={(n) => set("extras", { ...p.extras, urgentPct: n })} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Fuera de zona <Num label="Fuera de zona" prefix="US$" value={p.extras.far} onChange={(n) => set("extras", { ...p.extras, far: n })} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Drone suelto <Num label="Drone suelto" prefix="US$" value={p.extras.drone} onChange={(n) => set("extras", { ...p.extras, drone: n })} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Foto 360° de más <Num label="Foto extra" prefix="US$" value={p.extras.scene} onChange={(n) => set("extras", { ...p.extras, scene: n })} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Volumen 3 a 5 <Num label="Volumen 3" suffix="%" value={p.discounts.vol3} onChange={(n) => set("discounts", { ...p.discounts, vol3: n })} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Volumen 6 o más <Num label="Volumen 6" suffix="%" value={p.discounts.vol6} onChange={(n) => set("discounts", { ...p.discounts, vol6: n })} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Abrir arriba de lista <Num label="Abrir" suffix="%" value={p.openPct} onChange={(n) => set("openPct", n)} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Mínimo bajo la lista <Num label="Mínimo" suffix="%" value={p.minPct} onChange={(n) => set("minPct", n)} className="w-24" /></label>
            </div>
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Tus descuentos</p>
              <p className="text-xs text-gray-500">Aparecen como botones en la calculadora. Cambia el nombre o el porcentaje, o agrega otro.</p>
              {p.discountPresets.map((d, i) => (
                <div key={d.id} className="flex items-center gap-2">
                  <input value={d.name} aria-label="Nombre del descuento" onChange={(e) => set("discountPresets", p.discountPresets.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    className="flex-1 min-w-0 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#F0A030]/50" />
                  <Num label={`Porcentaje ${d.name}`} suffix="%" value={d.pct} onChange={(n) => set("discountPresets", p.discountPresets.map((x, j) => (j === i ? { ...x, pct: Math.min(100, Math.max(0, n)) } : x)))} className="w-20" />
                  <button type="button" onClick={() => set("discountPresets", p.discountPresets.filter((_, j) => j !== i))} className="p-1.5 text-gray-400 hover:text-red-500" aria-label={`Quitar ${d.name}`}><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" onClick={() => set("discountPresets", [...p.discountPresets, { id: `d${Date.now()}`, name: "Otro", pct: 10 }])} className="inline-flex items-center gap-1.5 text-[#0F2B4C] font-semibold hover:text-[#b8761a]"><Plus size={14} /> Agregar otro descuento</button>
            </div>
          </Card>
        </div>

        {/* Datos para cotizaciones */}
        <Card title="Datos para cotizaciones" desc="Lo que sale en cada cotización. Los datos bancarios son opcionales: si los llenas, puedes agregarlos o no a cada cotización con un botón. Se guardan con “Guardar cambios” y solo los ve el administrador.">
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Tu empresa</p>
              {([
                ["name", "Nombre"], ["rnc", "RNC"], ["phone", "Teléfono"], ["email", "Correo"], ["address", "Dirección"], ["web", "Web"],
              ] as [keyof Pricing["company"], string][]).map(([k, label]) => (
                <label key={k} className="grid grid-cols-[110px_1fr] items-center gap-2">
                  <span className="text-gray-600">{label}</span>
                  <input value={p.company[k]} onChange={(e) => set("company", { ...p.company, [k]: e.target.value })} className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#F0A030]/50" />
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Datos bancarios (opcional)</p>
              {([
                ["bank", "Banco", "Banco Popular, Banreservas, BHD…"], ["holder", "Titular", "Nombre en la cuenta"], ["accountType", "Tipo de cuenta", "Corriente / Ahorros"],
                ["account", "Número", "Número de cuenta"], ["currency", "Moneda", "RD$ o US$"], ["holderId", "RNC / cédula", "Del titular"],
              ] as [keyof Pricing["bank"], string, string][]).map(([k, label, ph]) => (
                <label key={k} className="grid grid-cols-[110px_1fr] items-center gap-2">
                  <span className="text-gray-600">{label}</span>
                  <input value={p.bank[k]} placeholder={ph} onChange={(e) => set("bank", { ...p.bank, [k]: e.target.value })} className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#F0A030]/50" />
                </label>
              ))}
              <p className="text-xs text-gray-500">{hasBank(p) ? "Listos: puedes agregarlos a las cotizaciones." : "Con banco y número de cuenta ya se pueden agregar."}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-[180px_1fr] gap-3 items-start border-t border-gray-100 pt-3">
            <label className="flex items-center justify-between gap-2 sm:flex-col sm:items-start">Válida por <Num label="Días de validez" suffix="días" value={p.quoteValidityDays} min={1} onChange={(n) => set("quoteValidityDays", Math.max(1, Math.round(n)))} className="w-28" /></label>
            <label className="flex flex-col gap-1">Condiciones por defecto
              <textarea rows={3} value={p.quoteConditions} onChange={(e) => set("quoteConditions", e.target.value)} className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#F0A030]/50 resize-y" />
            </label>
          </div>
        </Card>

        {/* Costos */}
        <Card title="Costos del negocio" desc="Lo que pagas cada mes para que la web, las fotos y las herramientas funcionen. Enciende cada plan cuando empieces a pagarlo. Parte de estos costos le toca a Tours 360 y el resto al resto de Cana Escapes.">
          <div className="space-y-2">
            {p.costs.map((c, i) => (
              <div key={c.id} className={cn("grid grid-cols-[auto_1fr_auto_auto] gap-2 items-start rounded-xl border p-2.5", c.active ? "border-gray-200 bg-white" : "border-dashed border-gray-200 bg-gray-50")}>
                <Switch checked={c.active} onCheckedChange={(v) => setCost(i, { active: v })} aria-label={c.active ? "Se paga" : "Todavía gratis"} />
                <div className="min-w-0 space-y-1">
                  <input value={c.name} aria-label="Servicio" onChange={(e) => setCost(i, { name: e.target.value })} className="w-full font-semibold text-[#0F2B4C] bg-transparent outline-none focus:bg-white rounded px-1" />
                  <input value={c.note} aria-label="Nota" onChange={(e) => setCost(i, { note: e.target.value })} className="w-full text-xs text-gray-500 bg-transparent outline-none focus:bg-white rounded px-1" />
                </div>
                <Num label={`Costo ${c.name}`} prefix="US$" suffix="/mes" value={c.usd} onChange={(n) => setCost(i, { usd: n })} className="w-32" />
                <button type="button" onClick={() => set("costs", p.costs.filter((_, j) => j !== i))} className="p-1.5 text-gray-400 hover:text-red-500" aria-label={`Quitar ${c.name}`}><Trash2 size={15} /></button>
              </div>
            ))}
            <button type="button" onClick={() => set("costs", [...p.costs, { id: `c${Date.now()}`, name: "Otro servicio", usd: 0, note: "", active: true }])} className="inline-flex items-center gap-1.5 text-[#0F2B4C] font-semibold hover:text-[#b8761a]"><Plus size={15} /> Agregar costo</button>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 pt-2 border-t border-gray-100">
            <label className="flex items-center justify-between gap-2">Parte que le toca a Tours 360 <Num label="Parte de Tours" suffix="%" value={p.toursShare} onChange={(n) => set("toursShare", Math.min(100, Math.max(0, n)))} className="w-24" /></label>
            <label className="flex items-center justify-between gap-2">Tours que esperas vender al mes <Num label="Tours al mes" value={p.toursPerMonth} min={1} onChange={(n) => set("toursPerMonth", Math.max(1, n))} className="w-24" /></label>
            <label className="flex items-center justify-between gap-2">Valor de tu hora <Num label="Valor hora" prefix="US$" value={p.hourValue} onChange={(n) => set("hourValue", n)} className="w-24" /></label>
            <label className="flex items-center justify-between gap-2">Traslado por visita <Num label="Traslado" prefix="US$" value={p.transport} onChange={(n) => set("transport", n)} className="w-24" /></label>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2"><span>Horas por trabajo (visita + edición + montaje):</span>
              {SIZES.map((s) => <label key={s.key} className="flex items-center gap-1 text-xs text-gray-500">{s.name} <Num label={`Horas ${s.name}`} step={0.5} suffix="h" value={p.hours[s.key]} onChange={(n) => set("hours", { ...p.hours, [s.key]: n })} className="w-20" /></label>)}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="rounded-xl bg-[#eef3f9] p-3"><p className="text-[11px] text-gray-500">Pagas hoy al mes</p><p className="text-lg font-bold text-[#0F2B4C] tabular-nums">{money(fc.total)}</p></div>
            <div className="rounded-xl bg-[#eef3f9] p-3"><p className="text-[11px] text-gray-500">Con todos los planes activos</p><p className="text-lg font-bold text-[#0F2B4C] tabular-nums">{money(fc.allIfActive)}</p></div>
            <div className="rounded-xl bg-[#eef3f9] p-3"><p className="text-[11px] text-gray-500">Le toca a Tours 360 ({p.toursShare}%)</p><p className="text-lg font-bold text-[#0F2B4C] tabular-nums">{money(fc.toursFull)}</p></div>
            <div className="rounded-xl bg-[#eef3f9] p-3"><p className="text-[11px] text-gray-500">Por cada tour (vendiendo {p.toursPerMonth} al mes)</p><p className="text-lg font-bold text-[#0F2B4C] tabular-nums">{money(fc.perTour)}</p></div>
          </div>
          {(() => {
            // Proyección del mes: N tours Plus medianos (la referencia) con lo que pagas hoy y con todos los planes
            const n = p.toursPerMonth;
            const income = refQuote.price * n;
            const variable = (refQuote.cost - refQuote.costLines[2].usd) * n;
            const today = income - variable - fc.tours;
            const full = income - variable - fc.toursFull;
            return (
              <div className="rounded-xl border border-gray-200 p-3 space-y-2">
                <p className="font-semibold text-[#0F2B4C]">Si vendes {n} tour{n === 1 ? "" : "s"} al mes <span className="font-normal text-gray-500">(Plus mediano a {fmtUsd(refQuote.price)} como referencia)</span></p>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 tabular-nums">
                  <div><p className="text-[11px] text-gray-500">Ingresos</p><p className="font-bold text-[#0F2B4C]">{money(income)}</p></div>
                  <div><p className="text-[11px] text-gray-500">Tu tiempo y traslados</p><p className="font-bold text-[#0F2B4C]">−{money(variable)}</p></div>
                  <div><p className="text-[11px] text-gray-500">Costos fijos de Tours (hoy)</p><p className="font-bold text-[#0F2B4C]">−{money(fc.tours)}</p></div>
                  <div><p className="text-[11px] text-gray-500">Te queda hoy</p><p className={cn("font-bold", today >= 0 ? "text-emerald-700" : "text-red-600")}>{today < 0 ? "−" : ""}{money(Math.abs(today))}</p></div>
                  <div><p className="text-[11px] text-gray-500">Con todos los planes</p><p className={cn("font-bold", full >= 0 ? "text-emerald-700" : "text-red-600")}>{full < 0 ? "−" : ""}{money(Math.abs(full))}</p></div>
                </div>
              </div>
            );
          })()}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex gap-3 items-start">
            <TrendingUp size={18} className="text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-emerald-900">
              Para cubrir la parte de Tours 360 con todos los planes activos ({fmtUsd(fc.toursFull)} al mes) necesitas
              {toursNeeded != null ? <> <b>{toursNeeded} tour{toursNeeded === 1 ? "" : "s"} Plus mediano{toursNeeded === 1 ? "" : "s"} al mes</b></> : " más margen por tour"}
              {subsNeeded != null && <>, o <b>{subsNeeded} suscripciones medianas</b> activas (eso lo cubre cada mes sin hacer trabajos nuevos)</>}.
            </p>
          </div>
        </Card>

        {/* Ventas y ganancias del mes */}
        <SalesPanel
          fixedToday={fc.tours} fixedFull={fc.toursFull} money={money}
          refPrice={refQuote.price} refVariable={refQuote.cost - refQuote.costLines[2].usd} minPct={p.minPct}
          draft={saleDraft} onDraftUsed={clearSaleDraft}
        />

        {/* Cotizaciones guardadas */}
        <Card title="Cotizaciones" desc="Las que has hecho. Ábrelas para descargarlas o compartirlas otra vez, y cambia el estado cuando el cliente responda.">
          {quotes.length === 0 ? (
            <p className="text-gray-500">Todavía no hay cotizaciones. Arma una en la calculadora y pulsa “Hacer cotización (PDF)”.</p>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[640px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-gray-500"><th className="py-2">Número</th><th className="py-2">Fecha</th><th className="py-2">Cliente</th><th className="py-2 text-right">Total</th><th className="py-2 pl-4">Estado</th><th /></tr></thead>
                <tbody>
                  {quotes.map((sq) => (
                    <tr key={sq.id} className="border-t border-gray-100">
                      <td className="py-2 font-semibold text-[#0F2B4C] whitespace-nowrap">{quoteNumber(sq.number, sq.created_at)}</td>
                      <td className="py-2 text-gray-600 whitespace-nowrap">{new Date(sq.created_at).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="py-2">{sq.client_name || <span className="text-gray-400">Sin nombre</span>}</td>
                      <td className="py-2 text-right tabular-nums">{money(Number(sq.total_usd))}</td>
                      <td className="py-2 pl-4">
                        <select value={sq.status} onChange={(e) => setQuoteStatus(sq, e.target.value as QuoteStatus)} aria-label="Estado"
                          className={cn("rounded-full px-2.5 py-1 text-xs font-semibold border-0 outline-none cursor-pointer", QUOTE_STATUS[sq.status].cls)}>
                          {(Object.keys(QUOTE_STATUS) as QuoteStatus[]).map((k) => <option key={k} value={k}>{QUOTE_STATUS[k].label}</option>)}
                        </select>
                      </td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button type="button" onClick={() => setEditor({ key: Date.now(), doc: mergeDoc(sq.data), saved: sq })} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[#0F2B4C] font-semibold hover:bg-gray-100"><FileText size={14} /> Abrir</button>
                        <button type="button" onClick={() => saleFromQuote(sq)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[#0F2B4C] font-semibold hover:bg-gray-100" title="Registrar como venta"><BadgeDollarSign size={14} /> Venta</button>
                        <button type="button" onClick={() => { if (window.confirm(`¿Borrar la cotización ${quoteNumber(sq.number, sq.created_at)}?`)) deleteQuote(sq); }} className="p-1.5 text-gray-400 hover:text-red-500" aria-label="Borrar cotización"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {editor && (
          <QuoteDialog key={editor.key} open onClose={() => setEditor(null)} pricing={p} initial={editor.doc} saved={editor.saved} onSaved={onQuoteSaved} />
        )}

        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Cuándo activar cada plan" desc="Paga solo lo que ya necesitas; las ventas van liberando cada paso.">
            <ol className="space-y-2">
              {PLAN_STEPS.map((s, i) => (
                <li key={s.when} className="grid grid-cols-[28px_1fr] gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#0F2B4C] text-[#F0A030] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div><b className="text-[#0F2B4C]">{s.when}</b><p className="text-gray-600">{s.what}</p></div>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Referencias del mercado" desc="De donde salen los precios sugeridos. Son precios publicados por cada empresa; confírmalos si los vas a citar.">
            <ul className="space-y-2">
              {MARKET.map((m) => (
                <li key={m.u} className="text-gray-700">{m.t} · <a href={m.u} target="_blank" rel="noreferrer" className="text-[#0F2B4C] font-semibold underline decoration-[#F0A030]/60 hover:decoration-[#F0A030]">{m.s}</a></li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setP(saved)} disabled={!dirty}><RotateCcw size={15} /> Descartar cambios</Button>
          <Button variant="outline" onClick={() => setP(DEFAULT_PRICING)}>Volver a los precios sugeridos</Button>
        </div>
      </div>

      {dirty && (
        <div className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full bg-[#0F2B4C] text-white pl-4 pr-1.5 py-1.5 shadow-xl">
          <span className="text-sm">Tienes cambios sin guardar</span>
          <Button size="sm" onClick={save} disabled={saving} className="rounded-full bg-[#F0A030] text-[#0F2B4C] hover:bg-[#e5952a]">{saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Guardar</Button>
        </div>
      )}
    </div>
  );
}
