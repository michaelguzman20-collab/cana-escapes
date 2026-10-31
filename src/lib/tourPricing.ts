// Precios de Tours 360 para /admin/tours/precios: lista por paquete y tamaño, suscripción, extras,
// descuentos, tasa del dólar y los costos fijos del negocio (Vercel, Supabase, Cloudflare, Claude…).
// Lo que se ajusta en la página se guarda en tour_pricing.data (una fila, solo admin); lo que falte
// se completa con DEFAULT_PRICING, así una versión nueva del código puede agregar campos sin romper.

export type PackKey = "e" | "p" | "l";
export type SizeKey = "s" | "m" | "l" | "x";

export const PACKS: { key: PackKey; name: string; hint: string }[] = [
  { key: "e", name: "Esencial", hint: "Solo el tour" },
  { key: "p", name: "Plus", hint: "+ fotos de interiores" },
  { key: "l", name: "Luxury", hint: "+ drone" },
];

export const SIZES: { key: SizeKey; name: string; hint: string }[] = [
  { key: "s", name: "Pequeña", hint: "Estudio o 1 hab · hasta 8 fotos 360°" },
  { key: "m", name: "Mediana", hint: "2–3 hab · 9 a 15 fotos" },
  { key: "l", name: "Grande", hint: "4–5 hab o villa · 16 a 25" },
  { key: "x", name: "Extra grande", hint: "6+ hab · 26 a 40 fotos" },
];

export interface FixedCost {
  id: string;
  name: string;
  usd: number; // al mes
  note: string;
  active: boolean; // false = todavía en plan gratis / no se paga
}

export interface Pricing {
  rate: number; // RD$ por US$1
  list: Record<PackKey, Record<SizeKey, number>>; // pago único, US$
  monthly: Record<SizeKey, number>; // suscripción, US$ al mes
  luxuryMonthlyExtra: number;
  minPct: number; // no bajar más de este % del precio de lista
  openPct: number; // abrir este % arriba de la lista
  extras: { urgentPct: number; far: number; drone: number; scene: number };
  discounts: { vol3: number; vol6: number; launch: number }; // % (launch: ya no se usa, quedó por compatibilidad)
  discountPresets: { id: string; name: string; pct: number }[]; // tus descuentos con nombre (botones en la calculadora)
  renewalYear: number; // pago único: mantenerlo en línea después del primer año
  // Costos por trabajo (para saber cuánto te queda)
  hourValue: number; // lo que vale tu hora
  hours: Record<SizeKey, number>; // visita + edición + montaje
  transport: number; // por visita
  // Costos fijos del negocio
  costs: FixedCost[];
  toursShare: number; // % de los costos fijos que le toca a Tours 360 (el resto es del resto de Cana Escapes)
  toursPerMonth: number; // tours que esperas vender al mes, para repartir el costo fijo
  // Cotizaciones
  company: { name: string; rnc: string; phone: string; email: string; address: string; web: string };
  bank: { bank: string; holder: string; accountType: string; account: string; currency: string; holderId: string };
  quoteValidityDays: number;
  quoteConditions: string;
}

export const ITBIS_RATE = 0.18;

export const DEFAULT_PRICING: Pricing = {
  rate: 60,
  list: {
    e: { s: 180, m: 250, l: 350, x: 480 },
    p: { s: 300, m: 400, l: 550, x: 720 },
    l: { s: 480, m: 620, l: 800, x: 1000 },
  },
  monthly: { s: 25, m: 30, l: 40, x: 50 },
  luxuryMonthlyExtra: 10,
  minPct: 15,
  openPct: 10,
  extras: { urgentPct: 25, far: 50, drone: 180, scene: 12 },
  discounts: { vol3: 10, vol6: 15, launch: 20 },
  discountPresets: [
    { id: "lanzamiento", name: "Lanzamiento", pct: 20 },
    { id: "referido", name: "Referido", pct: 10 },
    { id: "frecuente", name: "Cliente frecuente", pct: 10 },
    { id: "adelantado", name: "Pago por adelantado", pct: 5 },
    { id: "temporada", name: "Temporada baja", pct: 10 },
  ],
  renewalYear: 60,
  hourValue: 15,
  hours: { s: 2.5, m: 3.5, l: 5, x: 7 },
  transport: 15,
  costs: [
    { id: "vercel", name: "Vercel Pro (la web)", usd: 20, note: "El plan gratis (Hobby) no permite uso comercial. Activar con el primer cliente que pague.", active: false },
    { id: "supabase", name: "Supabase Pro (base de datos)", usd: 25, note: "El gratis se pausa tras 7 días sin uso y no tiene copias diarias. Activar con el primer cliente.", active: false },
    { id: "cloudflare", name: "Cloudflare R2 (fotos de los tours)", usd: 0, note: "Gratis hasta 10 GB (unos 200 tours). Después, unos US$0.015 por GB al mes.", active: true },
    { id: "claude", name: "Claude (Claude Code)", usd: 100, note: "Pro US$20 · Max US$100 · Max US$200 al mes. Pon el plan que pagas.", active: true },
    { id: "domain", name: "Dominio canaescapes.com", usd: 2, note: "Unos US$20 al año. Vence 2027-04-18.", active: true },
  ],
  toursShare: 50,
  toursPerMonth: 4,
  company: { name: "Cana Escapes", rnc: "133-70382-3", phone: "+1 (809) 210-2773", email: "michael@canaescapes.com", address: "Punta Cana, La Altagracia, República Dominicana", web: "canaescapes.com/tours" },
  bank: { bank: "", holder: "", accountType: "", account: "", currency: "", holderId: "" },
  quoteValidityDays: 15,
  quoteConditions:
    "50% al reservar la visita de fotos y 50% al entregar el enlace del tour.\n" +
    "El pago único incluye el tour en línea por 12 meses; después, la renovación es anual.\n" +
    "La fecha de la visita se coordina al confirmar la cotización.",
};

export const hasBank = (p: Pricing) => !!(p.bank.bank.trim() && p.bank.account.trim());

// ── Cotizaciones ─────────────────────────────────────────────────────────
export interface QuoteLine {
  desc: string;
  qty: number;
  unit: number; // US$ (negativo = descuento)
}

export interface QuoteClient {
  name: string;
  company: string;
  taxId: string; // RNC o cédula
  phone: string;
  email: string;
}

export interface QuoteDoc {
  client: QuoteClient;
  lines: QuoteLine[];
  itbis: boolean;
  currency: "usd" | "rd" | "both";
  rate: number;
  monthlyNote: string; // suscripción: lo que paga luego cada mes (fuera del total)
  conditions: string;
  validityDays: number;
  includeBank: boolean;
  date: string; // AAAA-MM-DD
}

/** Una cotización guardada, con valores por defecto si le falta algún campo */
export function mergeDoc(raw: unknown): QuoteDoc {
  const d = (isObj(raw) ? raw : {}) as Partial<QuoteDoc>;
  return {
    client: { name: "", company: "", taxId: "", phone: "", email: "", ...(isObj(d.client) ? d.client : {}) },
    lines: Array.isArray(d.lines) ? d.lines : [],
    itbis: d.itbis ?? true,
    currency: d.currency ?? "usd",
    rate: d.rate ?? DEFAULT_PRICING.rate,
    monthlyNote: d.monthlyNote ?? "",
    conditions: d.conditions ?? DEFAULT_PRICING.quoteConditions,
    validityDays: d.validityDays ?? DEFAULT_PRICING.quoteValidityDays,
    includeBank: d.includeBank ?? false,
    date: d.date ?? new Date().toISOString().slice(0, 10),
  };
}

export function quoteTotals(d: QuoteDoc) {
  const subtotal = d.lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit) || 0), 0);
  const itbis = d.itbis ? Math.round(subtotal * ITBIS_RATE * 100) / 100 : 0;
  return { subtotal, itbis, total: subtotal + itbis };
}

export const quoteNumber = (n: number, createdAt?: string) => `COT-${(createdAt ? new Date(createdAt) : new Date()).getFullYear()}-${String(n).padStart(4, "0")}`;

/** Las líneas de la cotización a partir de lo elegido en la calculadora */
export function linesFromQuote(q: QuoteInput, r: Quote): QuoteLine[] {
  const pack = PACKS.find((x) => x.key === q.pack)!.name;
  const size = SIZES.find((x) => x.key === q.size)!;
  const sub = q.pay === "suscripcion";
  const what = q.pack === "e" ? "tour virtual 360° con tu logo y enlace" : q.pack === "p" ? "tour virtual 360° + fotografía de interiores + acompañamiento" : "tour virtual 360° + fotografía de interiores + fotos y video con drone + acompañamiento extendido";
  if (q.manualPrice != null && q.manualPrice > 0) {
    return [{ desc: `Tours 360° · Paquete ${pack}${sub ? " (pago inicial de la suscripción)" : ""}: ${what}. Propiedad ${size.name.toLowerCase()} (${size.hint.split(" · ")[0]}).`, qty: q.qty, unit: q.manualPrice }];
  }
  const factor = sub ? 0.5 : 1;
  const lines: QuoteLine[] = r.lines.map((l, i) => ({
    desc: i === 0 ? `Tours 360° · Paquete ${pack}${sub ? " (pago inicial de la suscripción)" : ""}: ${what}. Propiedad ${size.name.toLowerCase()} (${size.hint.split(" · ")[0]}).` : l.label,
    qty: q.qty,
    unit: Math.round(l.usd * factor * 100) / 100,
  }));
  // Lo calculado se redondea a US$5: la diferencia va en la última línea (el descuento, si hay) para que el total coincida
  const sum = lines.reduce((s, l) => s + l.unit, 0);
  const diff = Math.round((r.setup - sum) * 100) / 100;
  const last = lines[lines.length - 1];
  if (diff !== 0) last.unit = Math.round((last.unit + diff) * 100) / 100;
  return lines;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Lo guardado encima de los valores sugeridos (los campos nuevos toman el valor sugerido) */
export function mergePricing(saved: unknown): Pricing {
  const deep = (base: unknown, over: unknown): unknown => {
    if (Array.isArray(base)) return Array.isArray(over) ? over : base;
    if (isObj(base)) {
      const out: Record<string, unknown> = { ...base };
      if (isObj(over)) for (const k of Object.keys(base)) if (k in over) out[k] = deep(base[k], over[k]);
      return out;
    }
    return typeof over === typeof base ? over : base;
  };
  return deep(DEFAULT_PRICING, saved) as Pricing;
}

export const round5 = (n: number) => Math.round(n / 5) * 5;
export const usd = (n: number) => `US$${Math.round(n).toLocaleString("en-US")}`;
export const rd = (n: number, rate: number) => `RD$${(Math.round((n * rate) / 100) * 100).toLocaleString("en-US")}`;

/** Costo fijo al mes: total del negocio y la parte de Tours 360 */
export function fixedCosts(p: Pricing) {
  const total = p.costs.filter((c) => c.active).reduce((s, c) => s + (Number(c.usd) || 0), 0);
  const allIfActive = p.costs.reduce((s, c) => s + (Number(c.usd) || 0), 0);
  const tours = (total * p.toursShare) / 100;
  const toursFull = (allIfActive * p.toursShare) / 100;
  return { total, allIfActive, tours, toursFull, perTour: p.toursPerMonth > 0 ? tours / p.toursPerMonth : tours };
}

export interface QuoteInput {
  pack: PackKey;
  size: SizeKey;
  pay: "unico" | "suscripcion";
  urgent: boolean;
  far: boolean;
  drone: boolean;
  extraScenes: number;
  qty: number;
  // Descuento propio de esta cotización: motivo y porcentaje (lanzamiento, cliente frecuente, referido…)
  discountOn: boolean;
  discountReason: string;
  discountPct: number;
  manualPrice: number | null; // precio acordado a mano (por propiedad); null = el calculado
}

export const NO_DISCOUNT = { discountOn: false, discountReason: "Lanzamiento", discountPct: 20 } as const;

export interface Quote {
  lines: { label: string; usd: number }[];
  price: number; // por propiedad, pago único (o base de la suscripción)
  open: number;
  min: number;
  setup: number; // suscripción: pago inicial
  monthly: number; // suscripción: cuota
  charged: number; // lo que paga al inicio por propiedad (precio acordado o setup)
  cost: number; // tu costo por propiedad: tiempo + traslado + parte del costo fijo
  costLines: { label: string; usd: number }[];
  profit: number; // lo que te queda al inicio por propiedad
  belowMin: boolean;
  discountLabel: string | null;
}

export function quote(p: Pricing, q: QuoteInput): Quote {
  const lines: Quote["lines"] = [];
  const packName = PACKS.find((x) => x.key === q.pack)!.name;
  const sizeName = SIZES.find((x) => x.key === q.size)!.name;
  let price = p.list[q.pack][q.size];
  lines.push({ label: `${packName} · ${sizeName}`, usd: price });
  if (q.drone && q.pack !== "l") { price += p.extras.drone; lines.push({ label: "Drone", usd: p.extras.drone }); }
  if (q.extraScenes > 0) { const v = q.extraScenes * p.extras.scene; price += v; lines.push({ label: `${q.extraScenes} fotos 360° de más`, usd: v }); }
  if (q.far) { price += p.extras.far; lines.push({ label: "Traslado fuera de zona", usd: p.extras.far }); }
  if (q.urgent) { const v = round5((price * p.extras.urgentPct) / 100); price += v; lines.push({ label: "Entrega urgente", usd: v }); }
  // Un solo descuento: el mayor entre el de volumen y el propio (con su motivo)
  const vol = q.qty >= 6 ? p.discounts.vol6 : q.qty >= 3 ? p.discounts.vol3 : 0;
  const own = q.discountOn ? Math.min(100, Math.max(0, Number(q.discountPct) || 0)) : 0;
  const disc = Math.max(vol, own);
  let discountLabel: string | null = null;
  if (disc > 0) {
    const v = round5((price * disc) / 100);
    price -= v;
    const reason = own >= vol ? q.discountReason.trim() || "Descuento" : "Volumen";
    discountLabel = `${reason} −${disc}%`;
    lines.push({ label: own >= vol ? `Descuento: ${reason} (−${disc}%)` : `Descuento por volumen (−${disc}%)`, usd: -v });
  }
  price = round5(price);
  const isSub = q.pay === "suscripcion";
  const base = isSub ? round5(price / 2) : price;
  const open = round5(base * (1 + p.openPct / 100));
  const min = round5(base * (1 - p.minPct / 100));
  const monthly = p.monthly[q.size] + (q.pack === "l" ? p.luxuryMonthlyExtra : 0);
  const charged = q.manualPrice != null && q.manualPrice > 0 ? q.manualPrice : base;

  const fc = fixedCosts(p);
  const hours = p.hours[q.size] + (q.extraScenes > 0 ? q.extraScenes * 0.15 : 0);
  const costLines = [
    { label: `Tu tiempo (${hours.toFixed(1)} h × ${usd(p.hourValue)})`, usd: hours * p.hourValue },
    { label: "Traslado", usd: p.transport + (q.far ? p.extras.far * 0.5 : 0) },
    { label: "Parte de los costos fijos", usd: fc.perTour },
  ];
  const cost = costLines.reduce((s, c) => s + c.usd, 0);
  return {
    lines, price, open, min, setup: base, monthly, charged, cost, costLines,
    profit: charged - cost, belowMin: charged < min, discountLabel,
  };
}

// ── Según el presupuesto del cliente ─────────────────────────────────────
const floor5 = (n: number) => Math.floor(n / 5) * 5;
const ceil5 = (n: number) => Math.ceil(n / 5) * 5;

export type BudgetFit = "lista" | "descuento" | "no";

export interface BudgetRow {
  pack: PackKey;
  list: number; // precio de lista por propiedad (con los extras elegidos)
  cost: number; // tu costo por propiedad
  floor: number; // lo mínimo que aceptas: el mínimo de la lista, y nunca por debajo de tu costo
  single: { fit: BudgetFit; amount: number; pct: number; spare: number; missing: number; profit: number };
  sub: { fit: BudgetFit; amount: number; pct: number; monthly: number; prepay: number; missing: number; profit: number; recoverMonths: number };
}

export interface BudgetAdvice {
  rows: BudgetRow[];
  rec: { pack: PackKey; pay: "unico" | "suscripcion"; amount: number } | null;
  upgrade: { pack: PackKey; amount: number; monthly: number } | null; // un paquete mayor en suscripción
  spare: { usd: number; scenes: number; drone: boolean } | null; // si le sobra presupuesto
  almost: { pack: PackKey; amount: number; missing: number } | null; // un paquete mayor en pago único al que le falta poco (≤10%)
}

/**
 * Qué se le puede ofrecer a un cliente con un presupuesto dado (US$ por propiedad, lo que paga al
 * inicio): por paquete, en pago único y en suscripción. Nunca baja del mínimo de la lista ni de tu
 * costo, así ninguno de los dos pierde. Usa el tamaño, los extras y la cantidad elegidos en la calculadora.
 */
export function budgetAdvice(p: Pricing, q: QuoteInput, budget: number): BudgetAdvice {
  const B = Math.max(0, budget || 0);
  const minF = 1 - p.minPct / 100;
  const rows: BudgetRow[] = (["l", "p", "e"] as PackKey[]).map((pack) => {
    const base = quote(p, { ...q, pack, pay: "unico", ...NO_DISCOUNT, manualPrice: null });
    const L = base.price;
    const cost = base.cost;
    const floor = Math.max(round5(L * minF), ceil5(cost));
    const s = B >= L
      ? { fit: "lista" as BudgetFit, amount: L, pct: 0, spare: B - L, missing: 0 }
      : B >= floor
        ? { fit: "descuento" as BudgetFit, amount: floor5(B), pct: Math.round((1 - floor5(B) / L) * 100), spare: 0, missing: 0 }
        : { fit: "no" as BudgetFit, amount: floor, pct: 0, spare: 0, missing: floor - B };
    const S = round5(L / 2);
    const monthly = p.monthly[q.size] + (pack === "l" ? p.luxuryMonthlyExtra : 0);
    const subFloor = round5(S * minF);
    const sub = B >= S
      ? { fit: "lista" as BudgetFit, amount: S, pct: 0, prepay: monthly > 0 ? Math.min(12, Math.floor((B - S) / monthly)) : 0, missing: 0 }
      : B >= subFloor
        ? { fit: "descuento" as BudgetFit, amount: floor5(B), pct: Math.round((1 - floor5(B) / S) * 100), prepay: 0, missing: 0 }
        : { fit: "no" as BudgetFit, amount: subFloor, pct: 0, prepay: 0, missing: subFloor - B };
    const subProfit = sub.amount - cost; // lo que te queda con el pago inicial (sin contar meses adelantados)
    return {
      pack, list: L, cost, floor,
      single: { ...s, profit: s.amount - cost },
      sub: { ...sub, monthly, profit: subProfit, recoverMonths: subProfit < 0 && monthly > 0 ? Math.ceil(-subProfit / monthly) : 0 },
    };
  });

  const singleFit = rows.find((r) => r.single.fit !== "no");
  const subFit = rows.find((r) => r.sub.fit !== "no");
  const rec = singleFit
    ? { pack: singleFit.pack, pay: "unico" as const, amount: singleFit.single.amount }
    : subFit
      ? { pack: subFit.pack, pay: "suscripcion" as const, amount: subFit.sub.amount }
      : null;
  // Con el mismo dinero, un paquete mayor en suscripción
  let upgrade: BudgetAdvice["upgrade"] = null;
  if (rec?.pay === "unico") {
    const i = rows.findIndex((r) => r.pack === rec.pack);
    const better = rows.slice(0, i).find((r) => r.sub.fit !== "no");
    if (better) upgrade = { pack: better.pack, amount: better.sub.amount, monthly: better.sub.monthly };
  }
  // Si le sobra: fotos 360° de más o el drone
  let spare: BudgetAdvice["spare"] = null;
  if (singleFit && singleFit.single.fit === "lista" && singleFit.single.spare >= p.extras.scene) {
    const left = singleFit.single.spare;
    spare = { usd: left, scenes: p.extras.scene > 0 ? Math.floor(left / p.extras.scene) : 0, drone: singleFit.pack !== "l" && !q.drone && left >= p.extras.drone };
  }
  // Casi le alcanza: el paquete justo encima, en pago único, a menos de 10% de su mínimo
  let almost: BudgetAdvice["almost"] = null;
  const recIdx = rec ? rows.findIndex((r) => r.pack === rec.pack) : rows.length;
  const above = recIdx > 0 ? rows[recIdx - 1] : null;
  if (above && above.single.fit === "no" && above.single.missing <= above.floor * 0.1) {
    almost = { pack: above.pack, amount: above.floor, missing: above.single.missing };
  }
  return { rows, rec, upgrade, spare, almost };
}
