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
  discounts: { vol3: number; vol6: number; launch: number }; // %
  renewalYear: number; // pago único: mantenerlo en línea después del primer año
  // Costos por trabajo (para saber cuánto te queda)
  hourValue: number; // lo que vale tu hora
  hours: Record<SizeKey, number>; // visita + edición + montaje
  transport: number; // por visita
  // Costos fijos del negocio
  costs: FixedCost[];
  toursShare: number; // % de los costos fijos que le toca a Tours 360 (el resto es del resto de Cana Escapes)
  toursPerMonth: number; // tours que esperas vender al mes, para repartir el costo fijo
}

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
};

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
  launch: boolean;
  manualPrice: number | null; // precio acordado a mano (por propiedad); null = el calculado
}

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
  // Un solo descuento: el mayor entre volumen y lanzamiento
  const vol = q.qty >= 6 ? p.discounts.vol6 : q.qty >= 3 ? p.discounts.vol3 : 0;
  const launch = q.launch ? p.discounts.launch : 0;
  const disc = Math.max(vol, launch);
  let discountLabel: string | null = null;
  if (disc > 0) {
    const v = round5((price * disc) / 100);
    price -= v;
    discountLabel = `${launch >= vol ? "Lanzamiento" : "Volumen"} −${disc}%`;
    lines.push({ label: `Descuento ${launch >= vol ? "de lanzamiento" : "por volumen"} (−${disc}%)`, usd: -v });
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
