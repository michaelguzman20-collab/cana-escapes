import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calculator, Copy, Loader2, Plus, RotateCcw, Save, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/tours";
import {
  DEFAULT_PRICING, PACKS, SIZES, fixedCosts, mergePricing, quote, round5, usd as fmtUsd, rd as fmtRd,
  type FixedCost, type PackKey, type Pricing, type QuoteInput, type SizeKey,
} from "@/lib/tourPricing";

// Precios de Tours 360 (solo admin): calculadora para cotizar en la cita, tasa del dólar, lista de
// precios editable y los costos fijos del negocio para saber cuánto queda y cuándo pagar cada plan.

type Show = "usd" | "rd" | "both";

function fail(title: string, e: unknown) {
  console.error(title, e);
  toast({ title, description: (e as { message?: string })?.message ?? String(e), variant: "destructive" });
}

/** Campo numérico corto */
function Num({ value, onChange, step = 1, min = 0, className, prefix, suffix, label }: {
  value: number; onChange: (n: number) => void; step?: number; min?: number; className?: string; prefix?: string; suffix?: string; label: string;
}) {
  return (
    <label className={cn("inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 focus-within:ring-2 focus-within:ring-[#F0A030]/50", className)}>
      {prefix && <span className="text-gray-400 text-xs">{prefix}</span>}
      <input
        type="number" inputMode="decimal" aria-label={label} step={step} min={min}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
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

function Card({ title, desc, children, className }: { title: string; desc?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-4", className)}>
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
  const [q, setQ] = useState<QuoteInput>({ pack: "p", size: "m", pay: "unico", urgent: false, far: false, drone: false, extraScenes: 0, qty: 1, launch: false, manualPrice: null });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("tour_pricing").select("data").eq("id", 1).maybeSingle();
    if (error) fail("Error al cargar los precios", error);
    const merged = mergePricing(data?.data ?? {});
    setSaved(merged);
    setP(merged);
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
  const refQuote = useMemo(() => quote(p, { ...q, pack: "p", size: "m", pay: "unico", urgent: false, far: false, drone: false, extraScenes: 0, qty: 1, launch: false, manualPrice: null }), [p, q]);
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
          <Card title="Cotizar" desc="Elige lo que pide el cliente. En el cuadro azul tienes el precio, hasta dónde bajar y cuánto te queda.">
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
                ["launch", `Precio de lanzamiento · −${p.discounts.launch}%`],
              ] as [keyof QuoteInput, string][]).map(([k, label]) => (
                <label key={k} className={cn("flex items-center gap-2", k === "drone" && q.pack === "l" && "opacity-40")}>
                  <Switch checked={!!q[k]} disabled={k === "drone" && q.pack === "l"} onCheckedChange={(v) => setQi(k, v as never)} /> <span>{label}</span>
                </label>
              ))}
              <label className="flex items-center gap-2">Fotos 360° de más <Num label="Fotos 360 de más" value={q.extraScenes} onChange={(n) => setQi("extraScenes", Math.max(0, Math.round(n)))} className="w-16" /><span className="text-xs text-gray-400">{fmtUsd(p.extras.scene)} c/u</span></label>
              <label className="flex items-center gap-2">Propiedades <Num label="Cantidad de propiedades" value={q.qty} min={1} onChange={(n) => setQi("qty", Math.max(1, Math.round(n)))} className="w-16" /><span className="text-xs text-gray-400">3+: −{p.discounts.vol3}% · 6+: −{p.discounts.vol6}%</span></label>
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

            <Button onClick={copyQuote} className="w-full bg-[#F0A030] text-[#0F2B4C] hover:bg-[#e5952a]"><Copy size={15} /> Copiar cotización para WhatsApp</Button>
          </div>
        </div>

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

          <Card title="Extras, descuentos y margen" desc="Solo se aplica un descuento: el mayor entre volumen y lanzamiento.">
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
              <label className="flex items-center justify-between gap-2">Entrega urgente <Num label="Urgente" suffix="%" value={p.extras.urgentPct} onChange={(n) => set("extras", { ...p.extras, urgentPct: n })} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Fuera de zona <Num label="Fuera de zona" prefix="US$" value={p.extras.far} onChange={(n) => set("extras", { ...p.extras, far: n })} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Drone suelto <Num label="Drone suelto" prefix="US$" value={p.extras.drone} onChange={(n) => set("extras", { ...p.extras, drone: n })} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Foto 360° de más <Num label="Foto extra" prefix="US$" value={p.extras.scene} onChange={(n) => set("extras", { ...p.extras, scene: n })} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Volumen 3 a 5 <Num label="Volumen 3" suffix="%" value={p.discounts.vol3} onChange={(n) => set("discounts", { ...p.discounts, vol3: n })} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Volumen 6 o más <Num label="Volumen 6" suffix="%" value={p.discounts.vol6} onChange={(n) => set("discounts", { ...p.discounts, vol6: n })} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Lanzamiento <Num label="Lanzamiento" suffix="%" value={p.discounts.launch} onChange={(n) => set("discounts", { ...p.discounts, launch: n })} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Abrir arriba de lista <Num label="Abrir" suffix="%" value={p.openPct} onChange={(n) => set("openPct", n)} className="w-24" /></label>
              <label className="flex items-center justify-between gap-2">Mínimo bajo la lista <Num label="Mínimo" suffix="%" value={p.minPct} onChange={(n) => set("minPct", n)} className="w-24" /></label>
            </div>
          </Card>
        </div>

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
            <div className="rounded-xl bg-[#eef3f9] p-3"><p className="text-[11px] text-gray-500">Por cada tour vendido</p><p className="text-lg font-bold text-[#0F2B4C] tabular-nums">{money(fc.perTour)}</p></div>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex gap-3 items-start">
            <TrendingUp size={18} className="text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-emerald-900">
              Para cubrir la parte de Tours 360 con todos los planes activos ({fmtUsd(fc.toursFull)} al mes) necesitas
              {toursNeeded != null ? <> <b>{toursNeeded} tour{toursNeeded === 1 ? "" : "s"} Plus mediano{toursNeeded === 1 ? "" : "s"} al mes</b></> : " más margen por tour"}
              {subsNeeded != null && <>, o <b>{subsNeeded} suscripciones medianas</b> activas (eso lo cubre cada mes sin hacer trabajos nuevos)</>}.
            </p>
          </div>
        </Card>

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
