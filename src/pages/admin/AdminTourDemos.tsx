import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, ClipboardList, Loader2, MapPin, Plus, Rotate3d, Save, Settings2, Video, X, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db, normalizeWhatsapp, whatsappLink } from "@/lib/tours";
import { summaryOf, type IntakeData } from "@/lib/tourIntake";
import { drDateKey, fmtDay, fmtTime, type DemoBooking, type DemoSettings, type DemoStatus } from "@/lib/tourDemos";
import { WhatsAppIcon } from "@/components/cana/WhatsAppIcon";

// Agenda de demostraciones de Tours 360: las citas que la gente toma en canaescapes.com/tours
// ("Agendar demostración") y el horario disponible (días, horas, duración, días bloqueados).

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const STATUS: Record<DemoStatus, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-amber-100 text-amber-800" },
  confirmada: { label: "Confirmada", cls: "bg-green-100 text-green-700" },
  realizada: { label: "Realizada", cls: "bg-blue-100 text-blue-700" },
  cancelada: { label: "Cancelada", cls: "bg-gray-100 text-gray-500" },
};

function fail(title: string, e: unknown) {
  console.error(title, e);
  toast({ title, description: (e as { message?: string })?.message ?? String(e), variant: "destructive" });
}

export function AdminTourDemos() {
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [settings, setSettings] = useState<DemoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"proximas" | "pasadas" | "canceladas">("proximas");
  const [showSettings, setShowSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, s] = await Promise.all([
      db.from("tour_demo_bookings").select("*").order("slot_start"),
      db.from("tour_demo_settings").select("*").eq("id", 1).single(),
    ]);
    if (b.error) fail("Error al cargar las citas", b.error);
    if (s.error) fail("Error al cargar el horario", s.error);
    setBookings(b.data ?? []);
    setSettings(s.data ?? null);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const now = Date.now();
  const lists = useMemo(() => ({
    proximas: bookings.filter((b) => b.status !== "cancelada" && new Date(b.slot_start).getTime() + b.slot_minutes * 60000 >= now),
    pasadas: bookings.filter((b) => b.status !== "cancelada" && new Date(b.slot_start).getTime() + b.slot_minutes * 60000 < now).reverse(),
    canceladas: bookings.filter((b) => b.status === "cancelada").reverse(),
  }), [bookings, now]);
  const shown = lists[tab];
  const pending = lists.proximas.filter((b) => b.status === "pendiente").length;

  // Agrupadas por día (en hora de RD)
  const byDay = useMemo(() => {
    const m = new Map<string, DemoBooking[]>();
    for (const b of shown) {
      const k = drDateKey(new Date(b.slot_start).getTime());
      m.set(k, [...(m.get(k) ?? []), b]);
    }
    return [...m.entries()];
  }, [shown]);

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
      <div className="max-w-screen-lg mx-auto space-y-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={20} className="text-[#0F2B4C]" />
            <div>
              <h1 className="text-xl font-bold text-[#0F2B4C]">Agenda de demostraciones · Tours 360</h1>
              <p className="text-xs text-gray-500">Las citas que reservan en canaescapes.com/tours. Confírmalas por WhatsApp.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowSettings((v) => !v)}>
              <Settings2 size={14} className="mr-1.5" /> Horario disponible
            </Button>
            <Link to="/admin/tours" className="inline-flex items-center gap-1.5 text-[#0F2B4C] font-semibold hover:text-[#b8761a]">
              <Rotate3d size={15} /> Tours 360
            </Link>
          </div>
        </div>

        {showSettings && settings && <SettingsCard settings={settings} onSaved={(s) => { setSettings(s); setShowSettings(false); }} />}

        <div className="grid grid-cols-3 gap-3">
          {([["proximas", "Próximas"], ["pasadas", "Pasadas"], ["canceladas", "Canceladas"]] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn("rounded-xl border p-3 text-left", tab === k ? "bg-[#0F2B4C] text-white border-[#0F2B4C]" : "bg-white border-gray-200 hover:shadow-sm")}
            >
              <span className="block text-2xl font-bold">{lists[k].length}</span>
              <span className={cn("text-xs", tab === k ? "text-white/70" : "text-gray-500")}>
                {label}{k === "proximas" && pending ? ` · ${pending} por confirmar` : ""}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500 flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Cargando…</p>
        ) : byDay.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
            <CalendarDays size={34} className="mx-auto mb-3 text-gray-300" />
            {tab === "proximas" ? "No hay citas próximas. Cuando alguien agende en /tours aparecerá aquí." : "Nada por aquí."}
          </div>
        ) : (
          <div className="space-y-5">
            {byDay.map(([day, list]) => (
              <div key={day}>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[#b8761a] first-letter:uppercase">{fmtDay(day, "es")}</p>
                <div className="space-y-3">
                  {list.map((b) => (
                    <BookingCard key={b.id} b={b} onChange={(nb) => setBookings((l) => l.map((x) => (x.id === nb.id ? nb : x)))} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({ b, onChange }: { b: DemoBooking; onChange(b: DemoBooking): void }) {
  const navigate = useNavigate();
  const [notes, setNotes] = useState(b.admin_notes ?? "");
  const [busy, setBusy] = useState(false);
  const ms = new Date(b.slot_start).getTime();
  const when = `${fmtDay(drDateKey(ms), "es")} a las ${fmtTime(ms, "es")}`;
  const wa = normalizeWhatsapp(b.phone);

  async function patch(p: Partial<DemoBooking>, ok?: string) {
    setBusy(true);
    const { data, error } = await db.from("tour_demo_bookings").update(p).eq("id", b.id).select().single();
    setBusy(false);
    if (error) return fail(/slot_unique|duplicate/.test(error.message) ? "Esa hora ya tiene otra cita activa" : "No se pudo guardar", error);
    onChange(data);
    if (ok) toast({ title: ok });
  }

  // Ficha del cliente con lo que ya dejó al agendar
  async function createIntake() {
    setBusy(true);
    const data: IntakeData = { cliente_nombre: b.name, cliente_whatsapp: b.phone };
    if (b.email) data.cliente_correo = b.email;
    if (b.company) data.cliente_empresa = b.company;
    if (b.notes) data.tour_descripcion = b.notes;
    const { data: row, error } = await db.from("tour_intakes").insert({ data, ...summaryOf(data) }).select().single();
    if (error) {
      setBusy(false);
      return fail("No se pudo crear la ficha", error);
    }
    await patch({ intake_id: row.id });
    navigate(`/admin/tours/fichas?ficha=${row.id}`);
  }

  const confirmText = `Hola ${b.name.split(" ")[0]}, te escribe Michael de Tours 360 (Cana Escapes). Te confirmo la demostración ${b.meeting === "virtual" ? "por videollamada" : "presencial"} el ${when}. ¡Nos vemos!`;

  return (
    <div className={cn("bg-white rounded-xl border p-4", b.status === "pendiente" ? "border-amber-300" : "border-gray-200")}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-20 shrink-0 text-center rounded-lg bg-[#0F2B4C] text-white py-2">
          <p className="text-lg font-bold leading-none">{fmtTime(ms, "es").replace(/\s?[ap]\.?\s?m\.?/i, "")}</p>
          <p className="text-[10px] text-white/70 mt-1">{/p\.?\s?m/i.test(fmtTime(ms, "es")) ? "p. m." : "a. m."} · {b.slot_minutes} min</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[#0F2B4C] text-base">{b.name}</p>
            <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", STATUS[b.status].cls)}>{STATUS[b.status].label}</span>
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              {b.meeting === "virtual" ? <Video size={13} /> : <MapPin size={13} />} {b.meeting === "virtual" ? "Virtual" : "Presencial"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{[b.company, b.client_type, b.lang === "en" ? "Inglés" : null].filter(Boolean).join(" · ")}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="text-gray-700">{b.phone}</span>
            {b.email && <a href={`mailto:${b.email}`} className="inline-flex items-center gap-1 text-[#b8761a] hover:underline"><Mail size={12} /> {b.email}</a>}
          </div>
          {b.notes && <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">“{b.notes}”</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {wa && (
          <a href={whatsappLink(wa, confirmText)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#25D366] text-white text-xs font-semibold hover:brightness-110">
            <WhatsAppIcon size={14} /> Escribir por WhatsApp
          </a>
        )}
        <select
          value={b.status}
          disabled={busy}
          onChange={(e) => patch({ status: e.target.value as DemoStatus }, `Cita ${STATUS[e.target.value as DemoStatus].label.toLowerCase()}`)}
          className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs font-semibold"
        >
          {(Object.keys(STATUS) as DemoStatus[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </select>
        {b.intake_id ? (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigate(`/admin/tours/fichas?ficha=${b.intake_id}`)}>
            <ClipboardList size={13} className="mr-1" /> Ver ficha
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-8 text-xs" disabled={busy} onClick={createIntake}>
            <ClipboardList size={13} className="mr-1" /> Crear ficha
          </Button>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} placeholder="Notas internas (solo tú las ves)" className="text-xs min-h-[34px]" />
        {notes !== (b.admin_notes ?? "") && (
          <Button size="sm" className="h-auto bg-green-600 hover:bg-green-700 text-white" disabled={busy} onClick={() => patch({ admin_notes: notes || null }, "Nota guardada")}>
            <Save size={13} />
          </Button>
        )}
      </div>
    </div>
  );
}

function SettingsCard({ settings, onSaved }: { settings: DemoSettings; onSaved(s: DemoSettings): void }) {
  const [f, setF] = useState(settings);
  const [newBlock, setNewBlock] = useState("");
  const [hourBlock, setHourBlock] = useState({ date: "", from: "", to: "" });
  const today = drDateKey(Date.now());
  // Bloqueos de horas: los pasados no se muestran (y se limpian al guardar)
  const hourBlocks = (f.blocked_slots ?? []).filter((b) => b.date >= today);
  const [saving, setSaving] = useState(false);
  const label = "block text-xs font-semibold text-gray-600 mb-1";

  async function save() {
    if (f.start_time >= f.end_time) return toast({ title: "La hora de inicio debe ser antes que la de fin", variant: "destructive" });
    if (!f.days.length) return toast({ title: "Elige al menos un día", variant: "destructive" });
    setSaving(true);
    const { id: _id, ...rest } = f;
    rest.blocked_slots = hourBlocks;
    const { data, error } = await db.from("tour_demo_settings").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", 1).select().single();
    setSaving(false);
    if (error) return fail("No se pudo guardar el horario", error);
    toast({ title: "Horario guardado", description: "La página /tours ya muestra los nuevos horarios." });
    onSaved(data);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <p className="font-semibold text-[#0F2B4C]">Horario disponible para demostraciones <span className="font-normal text-xs text-gray-500">(hora de RD)</span></p>
      <div>
        <p className={label}>Días</p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d, i) => {
            const on = f.days.includes(i);
            return (
              <button key={d} type="button" onClick={() => setF({ ...f, days: on ? f.days.filter((x) => x !== i) : [...f.days, i].sort() })} className={cn("w-12 h-9 rounded-lg border text-sm font-semibold", on ? "bg-[#0F2B4C] text-white border-[#0F2B4C]" : "border-gray-200 text-gray-500")}>
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <label><span className={label}>Desde</span><Input type="time" value={f.start_time.slice(0, 5)} onChange={(e) => setF({ ...f, start_time: e.target.value })} /></label>
        <label><span className={label}>Hasta</span><Input type="time" value={f.end_time.slice(0, 5)} onChange={(e) => setF({ ...f, end_time: e.target.value })} /></label>
        <label>
          <span className={label}>Duración</span>
          <select value={f.slot_minutes} onChange={(e) => setF({ ...f, slot_minutes: Number(e.target.value) })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm">
            {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </label>
        <label><span className={label}>Aviso mínimo (horas)</span><Input type="number" min={0} max={168} value={f.min_notice_hours} onChange={(e) => setF({ ...f, min_notice_hours: Number(e.target.value) })} /></label>
        <label><span className={label}>Hasta cuántos días</span><Input type="number" min={1} max={120} value={f.max_days_ahead} onChange={(e) => setF({ ...f, max_days_ahead: Number(e.target.value) })} /></label>
      </div>
      <div>
        <p className={label}>Días bloqueados (vacaciones, feriados, compromisos)</p>
        <div className="flex flex-wrap items-center gap-2">
          {f.blocked_dates.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 pl-3 pr-1 h-8 rounded-full bg-gray-100 text-xs font-semibold">
              {fmtDay(d, "es", { weekday: "short", day: "numeric", month: "short" })}
              <button type="button" onClick={() => setF({ ...f, blocked_dates: f.blocked_dates.filter((x) => x !== d) })} className="w-6 h-6 rounded-full hover:bg-gray-200 flex items-center justify-center" aria-label="Quitar">
                <X size={12} />
              </button>
            </span>
          ))}
          <Input type="date" value={newBlock} onChange={(e) => setNewBlock(e.target.value)} className="w-40 h-8" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            disabled={!newBlock}
            onClick={() => {
              if (!f.blocked_dates.includes(newBlock)) setF({ ...f, blocked_dates: [...f.blocked_dates, newBlock].sort() });
              setNewBlock("");
            }}
          >
            <Plus size={13} className="mr-1" /> Bloquear
          </Button>
        </div>
      </div>
      <div>
        <p className={label}>Horas cerradas (por ejemplo, si tienes un trabajo esas horas)</p>
        <div className="flex flex-wrap items-center gap-2">
          {hourBlocks.map((b, i) => (
            <span key={`${b.date}-${b.from}-${i}`} className="inline-flex items-center gap-1 pl-3 pr-1 h-8 rounded-full bg-gray-100 text-xs font-semibold">
              {fmtDay(b.date, "es", { weekday: "short", day: "numeric", month: "short" })} · {b.from}–{b.to}
              <button type="button" onClick={() => setF({ ...f, blocked_slots: hourBlocks.filter((x) => x !== b) })} className="w-6 h-6 rounded-full hover:bg-gray-200 flex items-center justify-center" aria-label="Quitar">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input type="date" min={today} value={hourBlock.date} onChange={(e) => setHourBlock({ ...hourBlock, date: e.target.value })} className="w-40 h-8" aria-label="Día" />
          <Input type="time" step={900} value={hourBlock.from} onChange={(e) => setHourBlock({ ...hourBlock, from: e.target.value })} className="w-28 h-8" aria-label="Desde" />
          <span className="text-xs text-gray-500">a</span>
          <Input type="time" step={900} value={hourBlock.to} onChange={(e) => setHourBlock({ ...hourBlock, to: e.target.value })} className="w-28 h-8" aria-label="Hasta" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            disabled={!hourBlock.date || !hourBlock.from || !hourBlock.to}
            onClick={() => {
              if (hourBlock.from >= hourBlock.to) return toast({ title: "La hora de inicio debe ser antes que la de fin", variant: "destructive" });
              setF({ ...f, blocked_slots: [...hourBlocks, hourBlock].sort((a, b) => (a.date + a.from).localeCompare(b.date + b.from)) });
              setHourBlock({ date: hourBlock.date, from: "", to: "" });
            }}
          >
            <Plus size={13} className="mr-1" /> Cerrar esas horas
          </Button>
        </div>
        <p className="mt-1 text-[11px] text-gray-400">Recuerda pulsar "Guardar horario" para que se apliquen.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
          {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />} Guardar horario
        </Button>
        <a href="/tours" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#b8761a] hover:underline">
          Ver cómo lo ve el cliente <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
