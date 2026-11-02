import { db, normalizeWhatsapp, whatsappLink } from "@/lib/tours";

// Prospectos de Tours 360 (/admin/tours/prospectos): la hoja "Contactos" del Excel de seguimiento,
// ahora en Supabase (tour_prospects + tour_prospect_events). Aquí viven las listas, los avisos de
// seguimiento, las plantillas de WhatsApp y la lectura de filas pegadas desde Excel.

export type Kind = "inmobiliaria" | "administrador" | "dueno" | "agente" | "proyecto" | "hotel" | "alianza" | "otro";
export type Zone = "bavaro" | "punta_cana" | "cap_cana" | "uvero_alto" | "cocotal" | "otra";
export type Source = "propio" | "referido" | "visita" | "redes" | "web" | "otro";
export type Received = "pdf" | "link" | "hoja" | "demo";
export type Interest = "alto" | "medio" | "bajo";
export type Status = "por_contactar" | "enviado" | "respondio" | "demo" | "propuesta" | "cliente" | "no_interesa";
export type EventKind = "whatsapp" | "llamada" | "visita" | "envio" | "respuesta" | "demo" | "nota" | "estado";

export interface Prospect {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  company: string | null;
  kind: Kind | null;
  phone: string | null;
  email: string | null;
  zone: Zone | null;
  source: Source | null;
  referred_by: string | null;
  referred_by_id: string | null;
  received: Received[];
  first_sent_at: string | null; // "2026-11-02"
  last_contact_at: string | null;
  responded: boolean;
  interest: Interest | null;
  properties: number | null;
  status: Status;
  next_step: string | null;
  next_step_date: string | null;
  quoted_usd: number | null;
  sold_usd: number | null;
  notes: string | null;
}
export type ProspectDraft = Omit<Prospect, "id" | "created_at" | "updated_at"> & { id?: string };

export interface ProspectEvent {
  id: string;
  prospect_id: string;
  created_at: string;
  happened_on: string;
  kind: EventKind;
  template: string | null;
  note: string | null;
}

type Opt<K extends string> = { key: K; label: string };

// Las mismas listas del Excel (más "Alianza" y "Web")
export const KINDS: Opt<Kind>[] = [
  { key: "inmobiliaria", label: "Inmobiliaria" }, { key: "administrador", label: "Administrador" },
  { key: "dueno", label: "Dueño de villa" }, { key: "agente", label: "Agente" }, { key: "proyecto", label: "Proyecto" },
  { key: "hotel", label: "Hotel" }, { key: "alianza", label: "Alianza (presta su propiedad)" }, { key: "otro", label: "Otro" },
];
export const ZONES: Opt<Zone>[] = [
  { key: "bavaro", label: "Bávaro" }, { key: "punta_cana", label: "Punta Cana" }, { key: "cap_cana", label: "Cap Cana" },
  { key: "uvero_alto", label: "Uvero Alto" }, { key: "cocotal", label: "Cocotal" }, { key: "otra", label: "Otra" },
];
export const SOURCES: Opt<Source>[] = [
  { key: "propio", label: "Contacto propio" }, { key: "referido", label: "Referido" }, { key: "visita", label: "Visita" },
  { key: "redes", label: "Redes" }, { key: "web", label: "Web (agendó demo)" }, { key: "otro", label: "Otro" },
];
export const RECEIVED: Opt<Received>[] = [
  { key: "pdf", label: "PDF" }, { key: "link", label: "Link" }, { key: "hoja", label: "Hoja impresa" }, { key: "demo", label: "Demo en persona" },
];
export const INTERESTS: Opt<Interest>[] = [{ key: "alto", label: "Alto" }, { key: "medio", label: "Medio" }, { key: "bajo", label: "Bajo" }];
export const STATUSES: (Opt<Status> & { cls: string })[] = [
  { key: "por_contactar", label: "Por contactar", cls: "bg-gray-100 text-gray-600" },
  { key: "enviado", label: "Enviado", cls: "bg-blue-100 text-blue-700" },
  { key: "respondio", label: "Respondió", cls: "bg-indigo-100 text-indigo-700" },
  { key: "demo", label: "Demo / visita", cls: "bg-purple-100 text-purple-700" },
  { key: "propuesta", label: "Propuesta", cls: "bg-amber-100 text-amber-800" },
  { key: "cliente", label: "Cliente", cls: "bg-green-100 text-green-700" },
  { key: "no_interesa", label: "No interesa", cls: "bg-red-50 text-red-600" },
];
export const EVENT_KINDS: Opt<EventKind>[] = [
  { key: "whatsapp", label: "WhatsApp" }, { key: "llamada", label: "Llamada" }, { key: "visita", label: "Visita" },
  { key: "envio", label: "Envío (PDF, link, hoja)" }, { key: "respuesta", label: "Respondió" }, { key: "demo", label: "Demo" },
  { key: "nota", label: "Nota" }, { key: "estado", label: "Cambio de estado" },
];

export const label = <K extends string>(list: Opt<K>[], k: K | null | undefined) => list.find((o) => o.key === k)?.label ?? "";
export const statusOf = (k: Status) => STATUSES.find((s) => s.key === k) ?? STATUSES[0];

/** Días sin respuesta para que el prospecto salga como "seguimiento vencido" (el mensaje 5 va a los 2–3 días) */
export const FOLLOWUP_DAYS = 3;
/** Estados que ya no piden seguimiento */
const CLOSED: Status[] = ["cliente", "no_interesa"];

export const todayDR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Santo_Domingo" });

/** Días entre una fecha "AAAA-MM-DD" y hoy (en RD); null si no hay fecha */
export function daysSince(date: string | null, today = todayDR()) {
  if (!date) return null;
  return Math.round((Date.parse(today) - Date.parse(date.slice(0, 10))) / 86_400_000);
}

export type Followup = { level: "vencido" | "hoy"; reason: string } | null;

/** Aviso de seguimiento: próximo paso vencido u hoy, o 3+ días sin respuesta desde el último contacto */
export function followupOf(p: Prospect, today = todayDR()): Followup {
  if (CLOSED.includes(p.status)) return null;
  const next = p.next_step_date ? daysSince(p.next_step_date, today)! : null;
  if (next !== null && next > 0) return { level: "vencido", reason: `Próximo paso vencido hace ${next} ${next === 1 ? "día" : "días"}` };
  const quiet = daysSince(p.last_contact_at, today);
  if (!p.responded && p.status !== "por_contactar" && quiet !== null && quiet >= FOLLOWUP_DAYS) {
    return { level: "vencido", reason: `${quiet} días sin respuesta` };
  }
  if (next === 0) return { level: "hoy", reason: "Próximo paso: hoy" };
  return null;
}

export function emptyDraft(): ProspectDraft {
  return {
    name: "", company: null, kind: null, phone: null, email: null, zone: null, source: "propio", referred_by: null, referred_by_id: null,
    received: [], first_sent_at: null, last_contact_at: null, responded: false, interest: null, properties: null,
    status: "por_contactar", next_step: null, next_step_date: null, quoted_usd: null, sold_usd: null, notes: null,
  };
}

// ── Plantillas de WhatsApp (hoja "Mensajes" del Excel / kit de lanzamiento) ─────────────────────
export const TEMPLATES: { key: string; name: string; text: string }[] = [
  { key: "m1", name: "1. Formal (inmobiliaria o administrador)", text: "Buenos días, [Nombre]. Le saluda Michael Guzmán, de CanaEscapes, aquí en Bávaro.\n\nEstamos ofreciendo recorridos virtuales 360° para propiedades: el cliente entra a la villa o apartamento desde el celular, como si estuviera ahí, antes de visitar o reservar.\n\nPuede ver dos ejemplos reales aquí: canaescapes.com/tours\n\nSi le interesa, con gusto le preparo una propuesta para alguna de sus propiedades o paso por su oficina 10 minutos a mostrárselo. ¿Le parece?" },
  { key: "m2", name: "2. Casual (contacto de confianza)", text: "Hola [Nombre], ¿cómo va todo? 👋\n\nTe cuento que arranqué con algo nuevo: tours virtuales 360° de villas y apartamentos. La gente recorre la propiedad desde el cel antes de reservar o comprar.\n\nMira estos dos que ya hice 👉 canaescapes.com/tours\n\n¿Qué te parece? Si conoces a alguien con propiedades que le pueda servir, te lo agradezco mucho." },
  { key: "m3", name: "3. Corto (estados y grupos)", text: "🏡 Recorridos virtuales 360° para villas y apartamentos en Punta Cana. Que tu cliente vea la propiedad completa desde el celular antes de visitar. Ejemplos: canaescapes.com/tours — Escríbeme para más info." },
  { key: "m4", name: "4. Después de visitar una oficina (adjuntar PDF)", text: "[Nombre], un gusto haberle saludado hoy en [Inmobiliaria]. Como le mostré, aquí están los ejemplos de los recorridos 360°: canaescapes.com/tours\n\nLe dejo también la presentación. Cuando quiera coordinamos para hacer el de una de sus propiedades." },
  { key: "m5", name: "5. Seguimiento (2–3 días después)", text: "Hola [Nombre], ¿pudo ver la presentación de los tours 360°? Los ejemplos en vivo están aquí: canaescapes.com/tours\n\nEstoy separando las primeras propiedades de este mes con precio de lanzamiento. ¿Tiene alguna en mente?" },
  { key: "m6", name: "6. Pedir un referido", text: "[Nombre], una pregunta rápida: ¿conoces a algún dueño de villa, administrador o agente inmobiliario al que le pueda servir esto? Si me pasas su contacto o le reenvías el link, te lo agradezco. Y si sale algo, te tengo en cuenta 😉" },
  { key: "m7", name: "7. Cuando preguntan el precio", text: "Depende del tamaño de la propiedad y de cuántos espacios lleva el recorrido. Para una villa de [3] habitaciones está en [RD$ / US$ ____]. Este mes tengo precio de lanzamiento para los primeros clientes. ¿Me dice cuántas habitaciones tiene y le doy el precio exacto?" },
];

/** Plantilla con el nombre (solo el primero) y la empresa ya puestos; lo demás entre [corchetes] queda para editar */
export function fillTemplate(text: string, p: Pick<Prospect, "name" | "company">) {
  const first = p.name.trim().split(/\s+/)[0] ?? "";
  return text
    .replace(/\[Nombre\]/g, first || "[Nombre]")
    .replace(/\[Inmobiliaria\]/g, p.company?.trim() || "[Inmobiliaria]");
}

/** Plantilla sugerida según el punto en que va el prospecto */
export function suggestedTemplate(p: Prospect) {
  if (p.status === "por_contactar") return p.kind === "inmobiliaria" || p.kind === "administrador" ? "m1" : "m2";
  if (!p.responded) return "m5";
  if (p.status === "respondio") return "m7";
  return "m6";
}

export function prospectWhatsapp(p: Prospect, text: string) {
  const phone = normalizeWhatsapp(p.phone);
  return phone ? whatsappLink(phone, text) : null;
}

// ── Datos: Supabase, o datos de prueba en este navegador ──────────────────────────────────────────
// En localhost el servidor de desarrollo usa la base REAL. Mientras la migración 20261102_tour_prospects
// no esté aplicada, la página trabaja con datos de prueba guardados solo en este navegador.

const DEMO_KEY = "tour-prospects-demo";
let demo: boolean | null = null;

const tableMissing = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "PGRST205" || e.code === "42P01" || (/tour_prospect/.test(e.message ?? "") && /schema cache|does not exist/.test(e.message ?? "")));

type DemoData = { prospects: Prospect[]; events: ProspectEvent[]; links?: Record<string, string>; expenses?: Expense[]; sales?: LSale[]; weeks?: Record<string, TourWeek> }; // sales: ventas de ejemplo // links: "tabla:id" → prospecto

function readDemo(): DemoData {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* sin almacenamiento: datos nuevos */ }
  const data = seedDemo();
  writeDemo(data);
  return data;
}
function writeDemo(d: DemoData) {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(d)); } catch { /* nada */ }
}
export function resetDemo() {
  try { localStorage.removeItem(DEMO_KEY); } catch { /* nada */ }
}

const uid = () => crypto.randomUUID();
const shift = (days: number) => {
  const d = new Date(Date.parse(todayDR()) + days * 86_400_000);
  return d.toISOString().slice(0, 10);
};

function seedDemo(): DemoData {
  const now = new Date().toISOString();
  const base = { ...emptyDraft(), created_at: now, updated_at: now };
  const rows: Prospect[] = [
    { ...base, id: uid(), name: "Laura Méndez", company: "Bávaro Realty", kind: "inmobiliaria", phone: "809 555 0101", zone: "bavaro", source: "visita", received: ["hoja", "pdf"], first_sent_at: shift(-6), last_contact_at: shift(-5), status: "enviado", interest: "medio", properties: 25, next_step: "Mensaje 5 (seguimiento)", next_step_date: shift(-2) },
    { ...base, id: uid(), name: "Carlos Peña", company: null, kind: "dueno", phone: "829 555 0102", zone: "cocotal", source: "propio", received: ["pdf", "link"], first_sent_at: shift(-4), last_contact_at: shift(-4), status: "enviado", properties: 1, next_step: "Mensaje 5 (seguimiento)", next_step_date: shift(1) },
    { ...base, id: uid(), name: "Ana Rodríguez", company: "Cap Cana Living", kind: "administrador", phone: "809 555 0103", zone: "cap_cana", source: "referido", referred_by: "Carlos Peña", received: ["link"], first_sent_at: shift(-3), last_contact_at: shift(-1), responded: true, status: "respondio", interest: "alto", properties: 12, next_step: "Mandar precio (mensaje 7)", next_step_date: shift(0) },
    { ...base, id: uid(), name: "José Martínez", company: "Uvero Homes", kind: "proyecto", phone: "849 555 0104", zone: "uvero_alto", source: "redes", received: ["link", "demo"], first_sent_at: shift(-9), last_contact_at: shift(-2), responded: true, status: "propuesta", interest: "alto", properties: 40, quoted_usd: 1800, next_step: "Llamar para cerrar", next_step_date: shift(2) },
    { ...base, id: uid(), name: "María Gómez", company: "Villa Coral", kind: "alianza", phone: "809 555 0105", zone: "punta_cana", source: "propio", received: ["demo"], first_sent_at: shift(-12), last_contact_at: shift(-3), responded: true, status: "cliente", interest: "alto", properties: 1, notes: "Presta la villa para fotos de muestra a cambio del tour gratis." },
    { ...base, id: uid(), name: "Pedro Santos", company: "Tropical Rentals", kind: "agente", phone: "809 555 0106", zone: "bavaro", source: "visita", received: ["hoja"], first_sent_at: shift(-1), last_contact_at: shift(-1), status: "enviado", interest: "bajo", next_step: "Mensaje 4", next_step_date: shift(2) },
    { ...base, id: uid(), name: "Hotel Arena Blanca", company: "Arena Blanca", kind: "hotel", phone: null, zone: "bavaro", source: "otro", status: "por_contactar", next_step: "Mensaje 1", next_step_date: shift(0) },
    { ...base, id: uid(), name: "Rosa Díaz", company: null, kind: "dueno", phone: "829 555 0108", zone: "otra", source: "propio", received: ["pdf"], first_sent_at: shift(-15), last_contact_at: shift(-10), responded: true, status: "no_interesa", interest: "bajo" },
  ];
  const events: ProspectEvent[] = rows.filter((r) => r.last_contact_at).map((r) => ({
    id: uid(), prospect_id: r.id, created_at: now, happened_on: r.last_contact_at!, kind: "whatsapp", template: null, note: "Dato de prueba",
  }));
  return { prospects: rows, events };
}

export const isDemo = () => demo === true;

/** Averigua una vez si se trabaja con Supabase o con los datos de prueba (todo lo que lee o guarda lo llama primero) */
export async function ensureMode() {
  if (demo === null) await loadProspects();
}

export async function getProspect(id: string): Promise<Prospect | null> {
  return (await loadProspects()).find((p) => p.id === id) ?? null;
}

export async function loadProspects(): Promise<Prospect[]> {
  if (demo) return readDemo().prospects;
  const { data, error } = await db.from("tour_prospects").select("*").order("created_at", { ascending: false });
  if (error && import.meta.env.DEV && tableMissing(error)) {
    demo = true;
    return readDemo().prospects;
  }
  if (error) throw error;
  demo = false;
  return (data ?? []).map((p: Prospect) => ({ ...p, received: p.received ?? [], quoted_usd: p.quoted_usd == null ? null : Number(p.quoted_usd), sold_usd: p.sold_usd == null ? null : Number(p.sold_usd) }));
}

/** Guarda (crea o actualiza) y devuelve la fila tal como quedó */
export async function saveProspect(draft: ProspectDraft): Promise<Prospect> {
  await ensureMode();
  const now = new Date().toISOString();
  if (demo) {
    const d = readDemo();
    const old = draft.id ? d.prospects.find((p) => p.id === draft.id) : undefined;
    const row: Prospect = { ...(old ?? { created_at: now }), ...draft, id: draft.id ?? uid(), updated_at: now } as Prospect;
    d.prospects = old ? d.prospects.map((p) => (p.id === row.id ? row : p)) : [row, ...d.prospects];
    writeDemo(d);
    return row;
  }
  const { id, ...fields } = draft;
  const q = id
    ? db.from("tour_prospects").update({ ...fields, updated_at: now }).eq("id", id)
    : db.from("tour_prospects").insert(fields);
  const { data, error } = await q.select().single();
  if (error) throw error;
  return data;
}

export async function saveMany(drafts: ProspectDraft[]): Promise<Prospect[]> {
  await ensureMode();
  if (demo) {
    const out: Prospect[] = [];
    for (const d of drafts) out.push(await saveProspect(d));
    return out;
  }
  const { data, error } = await db.from("tour_prospects").insert(drafts).select();
  if (error) throw error;
  return data ?? [];
}

export async function deleteProspect(id: string) {
  await ensureMode();
  if (demo) {
    const d = readDemo();
    const links = Object.fromEntries(Object.entries(d.links ?? {}).filter(([, pid]) => pid !== id));
    const expenses = d.expenses?.map((e) => (e.prospect_id === id ? { ...e, prospect_id: null } : e));
    writeDemo({ prospects: d.prospects.filter((p) => p.id !== id), events: d.events.filter((e) => e.prospect_id !== id), links, expenses });
    return;
  }
  const { error } = await db.from("tour_prospects").delete().eq("id", id);
  if (error) throw error;
}

export async function loadEvents(prospectId?: string): Promise<ProspectEvent[]> {
  await ensureMode();
  if (demo) {
    const all = readDemo().events;
    return (prospectId ? all.filter((e) => e.prospect_id === prospectId) : all).sort((a, b) => b.happened_on.localeCompare(a.happened_on) || b.created_at.localeCompare(a.created_at));
  }
  let q = db.from("tour_prospect_events").select("*").order("happened_on", { ascending: false }).order("created_at", { ascending: false });
  if (prospectId) q = q.eq("prospect_id", prospectId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function addEvent(e: Pick<ProspectEvent, "prospect_id" | "kind"> & Partial<Pick<ProspectEvent, "happened_on" | "template" | "note">>): Promise<ProspectEvent> {
  await ensureMode();
  const row = { happened_on: todayDR(), template: null, note: null, ...e };
  if (demo) {
    const d = readDemo();
    const ev: ProspectEvent = { ...row, id: uid(), created_at: new Date().toISOString() };
    d.events = [ev, ...d.events];
    writeDemo(d);
    return ev;
  }
  const { data, error } = await db.from("tour_prospect_events").insert(row).select().single();
  if (error) throw error;
  return data;
}

// ── Lo que se liga a un prospecto: cotización, venta, ficha, demo y tour ─────────────────────────
// En Supabase es la columna prospect_id de cada tabla; en modo prueba el enlace se guarda en este navegador.

export type LinkTable = "tour_quotes" | "tour_sales" | "tour_intakes" | "tour_demo_bookings" | "tours";

export interface LQuote { id: string; prospect_id: string | null; number: number; created_at: string; status: string; client_name: string; total_usd: number; data: { client?: { name?: string; company?: string; phone?: string } } }
export interface LSale { id: string; prospect_id: string | null; sale_date: string; client_name: string; amount_usd: number; monthly_usd: number; months: number; pay: string; status: string; quote_id: string | null; cost_usd: number }
export interface LIntake { id: string; prospect_id: string | null; created_at: string; client_name: string | null; company: string | null; property_name: string | null; tour_id: string | null; data: Record<string, unknown> }
export interface LDemo { id: string; prospect_id: string | null; slot_start: string; name: string; phone: string; company: string | null; status: string; intake_id: string | null }
export interface LTour { id: string; prospect_id: string | null; slug: string; title: string; published: boolean; property_name: string | null; created_at: string }
export interface Linkables { quotes: LQuote[]; sales: LSale[]; intakes: LIntake[]; demos: LDemo[]; tours: LTour[] }

const LINK_COLS: Record<LinkTable, string> = {
  tour_quotes: "id, number, created_at, status, client_name, total_usd, data",
  tour_sales: "id, sale_date, client_name, amount_usd, monthly_usd, months, pay, status, quote_id, cost_usd",
  tour_intakes: "id, created_at, client_name, company, property_name, tour_id, data",
  tour_demo_bookings: "id, slot_start, name, phone, company, status, intake_id",
  tours: "id, slug, title, published, property_name, created_at",
};

export async function loadLinkables(): Promise<Linkables> {
  await ensureMode();
  const links = demo ? readDemo().links ?? {} : {};
  const get = async <T,>(table: LinkTable, order: string): Promise<T[]> => {
    const { data, error } = await db.from(table).select(LINK_COLS[table] + (demo ? "" : ", prospect_id")).order(order, { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: { id: string; prospect_id?: string | null }) => ({ ...r, prospect_id: demo ? links[`${table}:${r.id}`] ?? null : r.prospect_id ?? null }));
  };
  const [quotes, sales, intakes, demos, tours] = await Promise.all([
    get<LQuote>("tour_quotes", "created_at"), get<LSale>("tour_sales", "sale_date"), get<LIntake>("tour_intakes", "created_at"),
    get<LDemo>("tour_demo_bookings", "slot_start"), get<LTour>("tours", "created_at"),
  ]);
  if (demo) sales.push(...demoSales());
  return {
    quotes: quotes.map((q) => ({ ...q, total_usd: Number(q.total_usd) })),
    sales: sales.map((x) => ({ ...x, amount_usd: Number(x.amount_usd), monthly_usd: Number(x.monthly_usd), cost_usd: Number(x.cost_usd) })),
    intakes, demos, tours,
  };
}

/** Modo prueba: dos ventas de ejemplo (la alianza que ya es cliente y una suscripción) para ver los números */
function demoSales(): LSale[] {
  const d = readDemo();
  if (!d.sales) {
    const ally = d.prospects.find((p) => p.kind === "alianza");
    const prop = d.prospects.find((p) => p.status === "propuesta");
    d.sales = [
      { id: uid(), prospect_id: ally?.id ?? null, sale_date: shift(-8), client_name: "Villa Coral (prueba)", amount_usd: 250, monthly_usd: 0, months: 12, pay: "unico", status: "activa", quote_id: null, cost_usd: 40 },
      { id: uid(), prospect_id: prop?.id ?? null, sale_date: shift(-40), client_name: "Uvero Homes (prueba)", amount_usd: 300, monthly_usd: 45, months: 12, pay: "suscripcion", status: "activa", quote_id: null, cost_usd: 60 },
    ];
    writeDemo(d);
  }
  return d.sales;
}

/** Liga (o desliga, con null) una fila de otra tabla a un prospecto */
export async function setLink(table: LinkTable, rowId: string, prospectId: string | null) {
  await ensureMode();
  if (demo) {
    const d = readDemo();
    if (table === "tour_sales" && d.sales?.some((x) => x.id === rowId)) {
      writeDemo({ ...d, sales: d.sales.map((x) => (x.id === rowId ? { ...x, prospect_id: prospectId } : x)) });
      return;
    }
    const links = { ...(d.links ?? {}) };
    if (prospectId) links[`${table}:${rowId}`] = prospectId;
    else delete links[`${table}:${rowId}`];
    writeDemo({ ...d, links });
    return;
  }
  const { error } = await db.from(table).update({ prospect_id: prospectId }).eq("id", rowId);
  if (error) throw error;
}

/** Lo que vale una venta: el cobro inicial más las cuotas de la suscripción */
export const saleValue = (s: Pick<LSale, "amount_usd" | "monthly_usd" | "months" | "status">) =>
  s.status === "cancelada" ? 0 : s.amount_usd + s.monthly_usd * s.months;

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-8);
const sameName = (a: unknown, b: string | null | undefined) => {
  const x = plain(String(a ?? "")), y = plain(b ?? "");
  return x.length > 2 && y.length > 2 && (x.includes(y) || y.includes(x));
};

/** ¿Esta fila parece de este prospecto? (mismo teléfono o nombre/empresa parecidos) — para sugerirla primero */
export function looksLike(p: Pick<Prospect, "name" | "company" | "phone">, phones: unknown[], names: unknown[]) {
  const ph = digits(p.phone);
  if (ph.length === 8 && phones.some((x) => digits(x) === ph)) return true;
  return names.some((n) => sameName(n, p.name) || sameName(n, p.company));
}

/** El estado sube (nunca baja) cuando se liga algo: cotización → Propuesta, demo → Demo / visita, venta → Cliente */
export function raiseStatus(current: Status, to: Status): Status {
  const order: Status[] = ["por_contactar", "enviado", "respondio", "demo", "propuesta", "cliente"];
  if (current === "no_interesa" && to !== "cliente") return current;
  return order.indexOf(to) > order.indexOf(current) ? to : current;
}

// ── Pegar filas desde Excel ──────────────────────────────────────────────────────────────────────
// Se copian las filas de la hoja "Contactos" (con o sin la fila de títulos) y se pegan en la página.
// Las columnas van en el orden del Excel: A Nombre … T Notas.

const EXCEL_COLUMNS = [
  "nombre", "empresa", "tipo", "telefono", "zona", "como llego", "referido por", "que recibio", "fecha 1er envio", "ultimo contacto",
  "dias sin contacto", "respondio", "interes", "n propiedades", "estado", "cotizado us$", "vendido us$", "proximo paso", "fecha proximo paso", "notas",
];

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?º°]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function pick<K extends string>(list: Opt<K>[], raw: string, extra: Record<string, K> = {}): K | null {
  const v = plain(raw);
  if (!v) return null;
  return list.find((o) => plain(o.label) === v || o.key === v)?.key ?? extra[v] ?? null;
}

/** "02/11/2026", "2/11/26", "2026-11-02" o el número de serie de Excel → "2026-11-02" */
export function parseDate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  if (/^\d{5}$/.test(v)) return new Date(Date.UTC(1899, 11, 30) + Number(v) * 86_400_000).toISOString().slice(0, 10);
  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!m) return null;
  const [, d, mo, y] = m; // en RD se escribe día/mes/año
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  const iso = `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

const money = (raw: string) => {
  const n = Number(raw.replace(/[^\d.,-]/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", "."));
  return /\d/.test(raw) && Number.isFinite(n) ? n : null;
};

/** Convierte lo pegado (separado por tabuladores) en borradores; devuelve también las filas que no se entendieron */
export function parsePasted(text: string): { rows: ProspectDraft[]; skipped: number } {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  let cols = EXCEL_COLUMNS.map((_, i) => i); // posición de cada campo en la fila pegada
  const rows: ProspectDraft[] = [];
  let skipped = 0;
  for (const line of lines) {
    const cells = line.split("\t");
    const heads = cells.map(plain);
    if (heads.includes("nombre") && (heads.includes("estado") || heads.includes("telefono"))) {
      cols = EXCEL_COLUMNS.map((c) => heads.indexOf(c));
      continue;
    }
    const at = (i: number) => (cols[i] >= 0 ? (cells[cols[i]] ?? "").trim() : "");
    const name = at(0);
    if (!name) { skipped++; continue; }
    const rec = plain(at(7));
    const received: Received[] = rec === "pdf + link" ? ["pdf", "link"] : ([pick(RECEIVED, at(7), { "hoja": "hoja", "demo": "demo" })].filter(Boolean) as Received[]);
    rows.push({
      ...emptyDraft(),
      name: name.slice(0, 120),
      company: at(1) || null,
      kind: pick(KINDS, at(2), { "dueno de villa": "dueno", "alianza": "alianza" }),
      phone: at(3) || null,
      zone: pick(ZONES, at(4)),
      source: pick(SOURCES, at(5), { "web": "web" }) ?? "propio",
      referred_by: at(6) || null,
      received,
      first_sent_at: parseDate(at(8)),
      last_contact_at: parseDate(at(9)),
      responded: ["si", "s", "yes"].includes(plain(at(11))),
      interest: pick(INTERESTS, at(12)),
      properties: at(13) && Number.isFinite(Number(at(13))) ? Math.round(Number(at(13))) : null,
      status: pick(STATUSES, at(14), { "demo / visita": "demo", "demo": "demo", "respondio": "respondio" }) ?? "por_contactar",
      quoted_usd: money(at(15)),
      sold_usd: money(at(16)),
      next_step: at(17) || null,
      next_step_date: parseDate(at(18)),
      notes: at(19) || null,
    });
  }
  return { rows, skipped };
}

// ── Dinero: gastos, ingresos y visitas por tour ──────────────────────────────────────────────────

export type ExpenseCategory = "impresion" | "comision" | "alianza" | "publicidad" | "transporte" | "equipo" | "software" | "otro";

export interface Expense {
  id: string;
  created_at: string;
  spent_on: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: "rd" | "usd";
  rate: number;
  amount_usd: number;
  prospect_id: string | null;
  tour_id: string | null;
  notes: string | null;
}
export type ExpenseDraft = Omit<Expense, "id" | "created_at" | "amount_usd"> & { id?: string };

export const EXPENSE_CATEGORIES: Opt<ExpenseCategory>[] = [
  { key: "impresion", label: "Impresión (papel, tinta)" }, { key: "comision", label: "Comisión" },
  { key: "alianza", label: "Alianza (propiedad prestada)" }, { key: "publicidad", label: "Publicidad" },
  { key: "transporte", label: "Transporte" }, { key: "equipo", label: "Equipo" }, { key: "software", label: "Programas" }, { key: "otro", label: "Otro" },
];

export const toUsd = (amount: number, currency: "rd" | "usd", rate: number) =>
  Math.round((currency === "usd" ? amount : amount / (rate > 0 ? rate : 60)) * 100) / 100;

/** La tasa del dólar que se usa en Precios Tours 360 */
export async function loadRate(): Promise<number> {
  const { data } = await db.from("tour_pricing").select("data").eq("id", 1).maybeSingle();
  const r = Number(data?.data?.rate);
  return r > 0 ? r : 60;
}

function seedExpenses(prospects: Prospect[]): Expense[] {
  const now = new Date().toISOString();
  const ally = prospects.find((p) => p.kind === "alianza");
  const ref = prospects.find((p) => p.source === "referido");
  const rows: Omit<Expense, "id" | "created_at" | "amount_usd">[] = [
    { spent_on: shift(-6), category: "impresion", description: "Papel mate 200 g (100 hojas)", amount: 950, currency: "rd", rate: 60.25, prospect_id: null, tour_id: null, notes: null },
    { spent_on: shift(-6), category: "impresion", description: "Tinta de color", amount: 1800, currency: "rd", rate: 60.25, prospect_id: null, tour_id: null, notes: null },
    { spent_on: shift(-10), category: "alianza", description: "Limpieza de la villa antes de las fotos", amount: 2500, currency: "rd", rate: 60.25, prospect_id: ally?.id ?? null, tour_id: null, notes: "Dato de prueba" },
    { spent_on: shift(-2), category: "comision", description: "Comisión por referido", amount: 25, currency: "usd", rate: 60.25, prospect_id: ref?.id ?? null, tour_id: null, notes: "Dato de prueba" },
    { spent_on: shift(-3), category: "transporte", description: "Gasolina, visitas a oficinas", amount: 1200, currency: "rd", rate: 60.25, prospect_id: null, tour_id: null, notes: null },
  ];
  return rows.map((r) => ({ ...r, id: uid(), created_at: now, amount_usd: toUsd(r.amount, r.currency, r.rate) }));
}

export async function loadExpenses(): Promise<Expense[]> {
  await ensureMode();
  if (demo) {
    const d = readDemo();
    if (!d.expenses) {
      d.expenses = seedExpenses(d.prospects);
      writeDemo(d);
    }
    return [...d.expenses].sort((a, b) => b.spent_on.localeCompare(a.spent_on));
  }
  const { data, error } = await db.from("tour_expenses").select("*").order("spent_on", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((e: Expense) => ({ ...e, amount: Number(e.amount), rate: Number(e.rate), amount_usd: Number(e.amount_usd) }));
}

export async function saveExpense(draft: ExpenseDraft): Promise<Expense> {
  await ensureMode();
  const fields = { ...draft, amount_usd: toUsd(draft.amount, draft.currency, draft.rate) };
  if (demo) {
    const d = readDemo();
    const list = d.expenses ?? [];
    const old = draft.id ? list.find((e) => e.id === draft.id) : undefined;
    const row: Expense = { ...(old ?? { created_at: new Date().toISOString() }), ...fields, id: draft.id ?? uid() } as Expense;
    d.expenses = old ? list.map((e) => (e.id === row.id ? row : e)) : [row, ...list];
    writeDemo(d);
    return row;
  }
  const { id, ...row } = fields;
  const q = id ? db.from("tour_expenses").update(row).eq("id", id) : db.from("tour_expenses").insert(row);
  const { data, error } = await q.select().single();
  if (error) throw error;
  return { ...data, amount: Number(data.amount), rate: Number(data.rate), amount_usd: Number(data.amount_usd) };
}

export async function deleteExpense(id: string) {
  await ensureMode();
  if (demo) {
    const d = readDemo();
    d.expenses = (d.expenses ?? []).filter((e) => e.id !== id);
    writeDemo(d);
    return;
  }
  const { error } = await db.from("tour_expenses").delete().eq("id", id);
  if (error) throw error;
}

export interface TourVisits { tour_id: string; visits: number; visitors: number; visits_recent: number; visitors_recent: number; first_visit: string | null; last_visit: string | null }

/** Visitas por tour (sin las del equipo). `days` = la ventana de "recientes" */
export async function loadTourVisits(days = 30): Promise<Map<string, TourVisits>> {
  const out = new Map<string, TourVisits>();
  const { data, error } = await db.rpc("tour_visit_totals", { p_days: days });
  if (!error) {
    for (const r of data ?? []) out.set(r.tour_id, { ...r, visits: Number(r.visits), visitors: Number(r.visitors), visits_recent: Number(r.visits_recent), visitors_recent: Number(r.visitors_recent) });
    return out;
  }
  // Sin la función todavía (migración sin aplicar): se cuentan aquí mismo
  const [v, i] = await Promise.all([
    db.from("site_visits").select("tour_id, visitor, created_at").not("tour_id", "is", null).order("created_at", { ascending: false }).limit(10000),
    db.from("internal_visitors").select("visitor"),
  ]);
  if (v.error) throw v.error;
  const team = new Set((i.data ?? []).map((x: { visitor: string }) => x.visitor));
  const since = Date.now() - days * 86_400_000;
  const seen = new Map<string, { all: Set<string>; recent: Set<string> }>();
  for (const r of (v.data ?? []) as { tour_id: string; visitor: string; created_at: string }[]) {
    if (team.has(r.visitor)) continue;
    const t = out.get(r.tour_id) ?? { tour_id: r.tour_id, visits: 0, visitors: 0, visits_recent: 0, visitors_recent: 0, first_visit: r.created_at, last_visit: r.created_at };
    const s = seen.get(r.tour_id) ?? { all: new Set<string>(), recent: new Set<string>() };
    t.visits++;
    s.all.add(r.visitor);
    if (Date.parse(r.created_at) >= since) { t.visits_recent++; s.recent.add(r.visitor); }
    if (r.created_at < (t.first_visit ?? r.created_at)) t.first_visit = r.created_at;
    if (r.created_at > (t.last_visit ?? "")) t.last_visit = r.created_at;
    t.visitors = s.all.size;
    t.visitors_recent = s.recent.size;
    out.set(r.tour_id, t);
    seen.set(r.tour_id, s);
  }
  return out;
}

// Rango de fechas "AAAA-MM-DD" (los dos incluidos); null = sin límite
export type Range = { from: string | null; to: string | null };

const monthIdx = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
const monthStart = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-01`;
export const inRange = (iso: string, r: Range) => (!r.from || iso >= r.from) && (!r.to || iso <= r.to);

/** Lo cobrado de una venta dentro del rango: el pago inicial en su fecha y cada cuota al inicio de los meses siguientes (como en Precios) */
export function saleIncomeIn(s: LSale, r: Range) {
  if (s.status === "cancelada") return 0;
  let total = inRange(s.sale_date, r) ? s.amount_usd : 0;
  if (s.pay === "suscripcion" && s.monthly_usd > 0) {
    const first = monthIdx(s.sale_date);
    for (let k = 1; k <= s.months; k++) if (inRange(monthStart(first + k), r)) total += s.monthly_usd;
  }
  return total;
}

/** Lo que ha dejado un prospecto hasta hoy (o en el rango): ventas ligadas a él */
export const prospectIncome = (pid: string, links: Linkables, r: Range = { from: null, to: todayDR() }) =>
  links.sales.filter((s) => s.prospect_id === pid).reduce((a, s) => a + saleIncomeIn(s, r), 0);

/** Ingreso de un tour: lo que pagó su cliente, repartido entre los tours de ese cliente */
export function tourIncome(tourId: string, links: Linkables) {
  const owner = links.tours.find((t) => t.id === tourId)?.prospect_id;
  if (!owner) return null;
  const count = links.tours.filter((t) => t.prospect_id === owner).length || 1;
  return prospectIncome(owner, links) / count;
}

// ── Metas y plan de la semana (hoja "Avance" del Excel) ──────────────────────────────────────────

export interface WeekTask { id: string; when: string; text: string; done: boolean; notes: string }
export interface TourWeek { week_start: string; goal_contacts: number; goal_conversations: number; goal_sales: number; tasks: WeekTask[] }

/** Metas por defecto de una semana nueva (las de la semana 1 del lanzamiento) */
export const DEFAULT_GOALS = { goal_contacts: 15, goal_conversations: 5, goal_sales: 2 };

/** Lunes (AAAA-MM-DD) de la semana de una fecha */
export function mondayOf(iso: string) {
  const d = new Date(iso.slice(0, 10) + "T12:00:00Z");
  const back = (d.getUTCDay() + 6) % 7; // lunes = 0
  return new Date(d.getTime() - back * 86_400_000).toISOString().slice(0, 10);
}
export const addDaysIso = (iso: string, n: number) => new Date(Date.parse(iso.slice(0, 10) + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

const FIRST_WEEK: TourWeek = {
  week_start: "2026-11-02", ...DEFAULT_GOALS,
  tasks: [
    ["Lun 2 nov", "Seguimiento a las 2 personas que ya tienen el PDF (mensaje 5)"],
    ["Lun 2 nov", "Escribir a los 3–4 contactos puntuales (mensaje 1 o 2)"],
    ["Lun 2 nov", "Anotar cada envío en Prospectos"],
    ["Lun 2 nov", "Comprar papel mate 160–200 g tamaño carta y tinta"],
    ["Mar–Mié 3–4 nov", "Imprimir 10 hojas informativas"],
    ["Mar–Mié 3–4 nov", "Buscar en Google Maps 10 inmobiliarias (dirección y horario)"],
    ["Mar–Mié 3–4 nov", "Pedir referidos a cada contacto interesado (mensaje 6)"],
    ["Jue–Vie 5–6 nov", "Visitar 5 oficinas de 9:30 a 11:30 (guion de visita)"],
    ["Jue–Vie 5–6 nov", "Mensaje 4 a cada oficina visitada, el mismo día"],
    ["Sáb 7 nov", "Revisar quién respondió, pidió precio o quiere demo"],
    ["Sáb 7 nov", "Ofrecer precio de lanzamiento a los 3 más interesados"],
    ["Protección", "Registrar el nombre comercial en ONAPI"],
    ["Protección", "Revisar que cada tour tenga logo y botón de WhatsApp"],
  ].map(([when, text], i) => ({ id: `t${i + 1}`, when, text, done: false, notes: "" })),
};

/** La semana guardada; si no existe, una nueva con las metas de la anterior y sin tareas */
export async function loadWeek(weekStart: string): Promise<TourWeek> {
  await ensureMode();
  if (demo) {
    const d = readDemo();
    const weeks = d.weeks ?? {};
    if (weeks[weekStart]) return weeks[weekStart];
    if (weekStart === FIRST_WEEK.week_start) return FIRST_WEEK;
    const prev = Object.values(weeks).filter((w) => w.week_start < weekStart).sort((a, b) => b.week_start.localeCompare(a.week_start))[0];
    return { week_start: weekStart, ...(prev ? { goal_contacts: prev.goal_contacts, goal_conversations: prev.goal_conversations, goal_sales: prev.goal_sales } : DEFAULT_GOALS), tasks: [] };
  }
  const { data, error } = await db.from("tour_weeks").select("*").lte("week_start", weekStart).order("week_start", { ascending: false }).limit(1);
  if (error) throw error;
  const w = data?.[0] as TourWeek | undefined;
  if (w?.week_start === weekStart) return { ...w, tasks: w.tasks ?? [] };
  return { week_start: weekStart, ...(w ? { goal_contacts: w.goal_contacts, goal_conversations: w.goal_conversations, goal_sales: w.goal_sales } : DEFAULT_GOALS), tasks: [] };
}

export async function saveWeek(w: TourWeek): Promise<TourWeek> {
  await ensureMode();
  if (demo) {
    const d = readDemo();
    writeDemo({ ...d, weeks: { ...(d.weeks ?? {}), [w.week_start]: w } });
    return w;
  }
  const { data, error } = await db.from("tour_weeks").upsert({ ...w, updated_at: new Date().toISOString() }).select().single();
  if (error) throw error;
  return data;
}

const CONTACT_KINDS: EventKind[] = ["whatsapp", "llamada", "visita", "envio", "demo"];

/** Avance de la semana: personas contactadas, conversaciones (respondieron) y ventas */
export function weekProgress(weekStart: string, prospects: Prospect[], events: ProspectEvent[], links: Linkables) {
  const end = addDaysIso(weekStart, 6);
  const r: Range = { from: weekStart, to: end };
  const touched = new Set<string>(), talked = new Set<string>(), sold = new Set<string>();
  for (const e of events) {
    if (!inRange(e.happened_on, r)) continue;
    if (CONTACT_KINDS.includes(e.kind)) touched.add(e.prospect_id);
    if (e.kind === "respuesta") talked.add(e.prospect_id);
    if (e.kind === "estado" && /→ Cliente$/.test(e.note ?? "")) sold.add(e.prospect_id);
  }
  for (const p of prospects) {
    if (p.first_sent_at && inRange(p.first_sent_at, r)) touched.add(p.id);
    if (p.responded && p.last_contact_at && inRange(p.last_contact_at, r) && p.status !== "enviado") talked.add(p.id);
  }
  for (const s of links.sales) if (s.status !== "cancelada" && inRange(s.sale_date, r)) sold.add(s.prospect_id ?? `venta:${s.id}`);
  return { contacts: touched.size, conversations: talked.size, sales: sold.size };
}

// ── Cifras del resumen ───────────────────────────────────────────────────────────────────────────

/** Cotizado y vendido de un prospecto: lo ligado (cotizaciones, ventas) o, si no hay, lo anotado a mano */
export function prospectMoney(p: Prospect, links: Linkables) {
  const quotes = links.quotes.filter((q) => q.prospect_id === p.id);
  const sales = links.sales.filter((s) => s.prospect_id === p.id);
  return {
    quoted: quotes.length ? quotes.reduce((a, q) => a + q.total_usd, 0) : p.quoted_usd ?? 0,
    sold: sales.length ? sales.reduce((a, s) => a + saleValue(s), 0) : p.sold_usd ?? 0,
  };
}

export const REACHED: Status[] = ["demo", "propuesta", "cliente"];

/** Contactos, respondieron, clientes y % por grupo (qué recibió, tipo, cómo llegó) */
export function breakdown<K extends string>(prospects: Prospect[], options: Opt<K>[], keyOf: (p: Prospect) => K[]) {
  return options.map((o) => {
    const group = prospects.filter((p) => keyOf(p).includes(o.key));
    const responded = group.filter((p) => p.responded).length;
    const clients = group.filter((p) => p.status === "cliente").length;
    return { key: o.key, label: o.label, contacts: group.length, responded, clients, pctResponse: group.length ? responded / group.length : 0, pctClose: group.length ? clients / group.length : 0 };
  });
}

// ── Exportar (CSV que abre en Excel) ─────────────────────────────────────────────────────────────

export type Cell = string | number | boolean | null | undefined;

export function toCsv(rows: Cell[][]) {
  return rows.map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function downloadCsv(fileName: string, rows: Cell[][]) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Las 20 columnas del Excel (más lo ligado), una fila por prospecto */
export function prospectRows(prospects: Prospect[], links: Linkables, today = todayDR()): Cell[][] {
  const head = ["Nombre", "Empresa", "Tipo", "Teléfono", "Correo", "Zona", "Cómo llegó", "Referido por", "Qué recibió", "Fecha 1er envío", "Último contacto",
    "Días sin contacto", "¿Respondió?", "Interés", "Nº propiedades", "Estado", "Cotizado US$", "Vendido US$", "Próximo paso", "Fecha próximo paso", "Aviso", "Tours", "Notas"];
  return [head, ...prospects.map((p) => {
    const m = prospectMoney(p, links);
    const tours = links.tours.filter((t) => t.prospect_id === p.id).map((t) => `${t.title}${t.published ? "" : " (borrador)"}`).join(" / ");
    return [p.name, p.company, label(KINDS, p.kind), p.phone, p.email, label(ZONES, p.zone), label(SOURCES, p.source), p.referred_by,
      p.received.map((r) => label(RECEIVED, r)).join(" + "), p.first_sent_at, p.last_contact_at, daysSince(p.last_contact_at, today),
      p.responded ? "Sí" : "No", label(INTERESTS, p.interest), p.properties, statusOf(p.status).label, m.quoted || "", m.sold || "",
      p.next_step, p.next_step_date, followupOf(p, today)?.reason ?? "", tours, p.notes];
  })];
}
