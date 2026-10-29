import { supabase } from "@/lib/supabase";

// Agenda de demostraciones de Tours 360. El visitante elige día y hora en /tours (DemoScheduler) y la cita
// queda en tour_demo_bookings; el horario disponible se configura en /admin/tours/agenda.
// Todo en hora de República Dominicana (UTC-4, sin horario de verano).

export const DR_OFFSET = "-04:00";
const DR_MS = -4 * 3600 * 1000;

export interface DemoAvailability {
  days: number[]; // 0 = domingo … 6 = sábado
  start_time: string; // "09:00"
  end_time: string;
  slot_minutes: number;
  min_notice_hours: number;
  max_days_ahead: number;
  blocked_dates: string[]; // "2026-11-05"
  taken: string[]; // ISO de las horas ya reservadas
}

export interface DemoSettings extends Omit<DemoAvailability, "taken"> {
  id: number;
  updated_at: string;
}

export type DemoStatus = "pendiente" | "confirmada" | "realizada" | "cancelada";

export interface DemoBooking {
  id: string;
  created_at: string;
  slot_start: string;
  slot_minutes: number;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  client_type: string | null;
  meeting: "virtual" | "presencial";
  notes: string | null;
  lang: string | null;
  status: DemoStatus;
  admin_notes: string | null;
  intake_id: string | null;
}

// Funciones nuevas que aún no están en los tipos generados de Supabase (bind: sin él, rpc pierde `this`)
const rpc = (supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> }).rpc.bind(supabase);

export async function fetchDemoAvailability(): Promise<DemoAvailability> {
  const { data, error } = await rpc("tour_demo_availability");
  if (error) throw error;
  return data as DemoAvailability;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};
const pad = (n: number) => String(n).padStart(2, "0");

/** Fecha "YYYY-MM-DD" en RD de un instante */
export function drDateKey(ms: number) {
  const d = new Date(ms + DR_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Hora "HH:MM" en RD de un instante */
export function drTime(ms: number) {
  const d = new Date(ms + DR_MS);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Horas libres por día (en RD), del día de hoy hasta max_days_ahead */
export function freeSlots(av: DemoAvailability, now = Date.now()) {
  const taken = new Set(av.taken.map((t) => new Date(t).getTime()));
  const blocked = new Set(av.blocked_dates);
  const earliest = now + av.min_notice_hours * 3600 * 1000;
  const latest = now + av.max_days_ahead * 86400 * 1000;
  const start = toMin(av.start_time);
  const end = toMin(av.end_time);
  const out = new Map<string, number[]>(); // fecha → instantes (ms)
  for (let i = 0; i <= av.max_days_ahead; i++) {
    const key = drDateKey(now + i * 86400 * 1000);
    const [y, m, d] = key.split("-").map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (!av.days.includes(dow) || blocked.has(key)) continue;
    const list: number[] = [];
    for (let t = start; t + av.slot_minutes <= end; t += av.slot_minutes) {
      const ms = new Date(`${key}T${pad(Math.floor(t / 60))}:${pad(t % 60)}:00${DR_OFFSET}`).getTime();
      if (ms >= earliest && ms <= latest && !taken.has(ms)) list.push(ms);
    }
    if (list.length) out.set(key, list);
  }
  return out;
}

export interface BookingInput {
  slot: number;
  name: string;
  phone: string;
  email: string;
  company: string;
  clientType: string;
  meeting: "virtual" | "presencial";
  notes: string;
  lang: string;
}

const ERRORS: Record<string, { es: string; en: string }> = {
  taken: { es: "Esa hora acaba de ser reservada por otra persona. Elige otra, por favor.", en: "That time was just booked by someone else. Please pick another one." },
  missing_fields: { es: "Escribe tu nombre y tu WhatsApp.", en: "Please enter your name and WhatsApp." },
  too_many: { es: "Ya tienes citas pendientes con este número. Escríbenos por WhatsApp si necesitas cambiarlas.", en: "You already have pending bookings with this number. Message us on WhatsApp to change them." },
  out_of_range: { es: "Esa hora ya no está disponible. Elige otra, por favor.", en: "That time is no longer available. Please pick another one." },
  closed: { es: "Ese día no tenemos horario disponible.", en: "We're not available on that day." },
  bad_slot: { es: "Esa hora no es válida. Elige otra, por favor.", en: "That time is not valid. Please pick another one." },
  too_long: { es: "Algún dato es demasiado largo.", en: "Some field is too long." },
};

export async function bookDemo(b: BookingInput): Promise<string> {
  const { data, error } = await rpc("book_tour_demo", {
    p_slot: new Date(b.slot).toISOString(),
    p_name: b.name,
    p_phone: b.phone,
    p_email: b.email,
    p_company: b.company,
    p_client_type: b.clientType,
    p_meeting: b.meeting,
    p_notes: b.notes,
    p_lang: b.lang,
  });
  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message?.includes(k));
    const lang = b.lang === "en" ? "en" : "es";
    throw new Error(key ? ERRORS[key][lang] : lang === "en" ? "We couldn't save your booking. Please try again." : "No se pudo guardar la cita. Inténtalo de nuevo.");
  }
  return data as string;
}

/** "jueves 5 de noviembre" / "Thursday, November 5" */
export function fmtDay(key: string, lang: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(lang === "en" ? "en-US" : "es-DO", { ...opts, timeZone: "UTC" });
}

/** "9:45 a. m." / "9:45 AM" en hora de RD */
export function fmtTime(ms: number, lang: string) {
  return new Date(ms).toLocaleTimeString(lang === "en" ? "en-US" : "es-DO", { hour: "numeric", minute: "2-digit", timeZone: "America/Santo_Domingo" });
}

/** Enlace para añadir la cita a Google Calendar */
export function googleCalendarLink(title: string, startMs: number, minutes: number, details: string) {
  const f = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${f(startMs)}/${f(startMs + minutes * 60000)}`, details });
  return `https://calendar.google.com/calendar/render?${q}`;
}
