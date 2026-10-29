import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CalendarPlus, ChevronLeft, ChevronRight, Clock, Loader2, MapPin, Video, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WhatsAppIcon } from "@/components/cana/WhatsAppIcon";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/tours";
import {
  bookDemo, drDateKey, fetchDemoAvailability, fmtDay, fmtTime, freeSlots, googleCalendarLink, type DemoAvailability,
} from "@/lib/tourDemos";

// Ventana para agendar una demostración de Tours 360 desde /tours: el visitante elige día y hora libres
// (en hora de RD), deja sus datos y la cita aparece en /admin/tours/agenda.

const T = {
  es: {
    title: "Agenda una demostración",
    desc: "Elige el día y la hora (hora de República Dominicana). Te confirmamos por WhatsApp.",
    loading: "Cargando horarios…",
    none: "Por ahora no hay horarios libres. Escríbenos por WhatsApp y lo coordinamos.",
    pickDay: "Elige un día",
    pickTime: "Elige la hora",
    otherTime: "¿Prefieres otra hora?",
    otherPh: "Elige la hora que te convenga",
    next: "Continuar",
    back: "Cambiar fecha",
    name: "Nombre y apellido",
    phone: "WhatsApp",
    email: "Correo (opcional)",
    company: "Empresa o inmobiliaria (opcional)",
    type: "Soy…",
    types: ["Inmobiliaria / agente / broker", "Anfitrión de renta corta", "Propietario", "Otro"],
    meeting: "¿Cómo prefieres la reunión?",
    virtual: "Virtual",
    virtualDesc: "Videollamada",
    presencial: "Presencial",
    presencialDesc: "En Bávaro / Punta Cana",
    notes: "¿Algo que debamos saber? (opcional)",
    notesPh: "Ej.: tengo 3 villas en Cap Cana para venta",
    book: "Confirmar cita",
    done: "¡Cita agendada!",
    doneDesc: "Te escribiremos por WhatsApp para confirmarla.",
    notify: "Avisar por WhatsApp",
    calendar: "Añadir a mi calendario",
    close: "Listo",
    calTitle: "Demostración Tours 360",
    week: ["D", "L", "M", "M", "J", "V", "S"],
    waText: (when: string, name: string, meet: string) => `Hola, soy ${name}. Acabo de agendar una demostración de Tours 360 para el ${when} (${meet}).`,
  },
  en: {
    title: "Book a demo",
    desc: "Pick a day and time (Dominican Republic time). We'll confirm on WhatsApp.",
    loading: "Loading times…",
    none: "No open times right now. Message us on WhatsApp and we'll set it up.",
    pickDay: "Pick a day",
    pickTime: "Pick a time",
    otherTime: "Prefer another time?",
    otherPh: "Pick the time that suits you",
    next: "Continue",
    back: "Change date",
    name: "Full name",
    phone: "WhatsApp",
    email: "Email (optional)",
    company: "Company or agency (optional)",
    type: "I am…",
    types: ["Real estate agency / agent / broker", "Short-term rental host", "Property owner", "Other"],
    meeting: "How would you like to meet?",
    virtual: "Online",
    virtualDesc: "Video call",
    presencial: "In person",
    presencialDesc: "In Bávaro / Punta Cana",
    notes: "Anything we should know? (optional)",
    notesPh: "E.g.: I have 3 villas for sale in Cap Cana",
    book: "Confirm booking",
    done: "You're booked!",
    doneDesc: "We'll message you on WhatsApp to confirm.",
    notify: "Let us know on WhatsApp",
    calendar: "Add to my calendar",
    close: "Done",
    calTitle: "Tours 360 demo",
    week: ["S", "M", "T", "W", "T", "F", "S"],
    waText: (when: string, name: string, meet: string) => `Hi, I'm ${name}. I just booked a Tours 360 demo for ${when} (${meet}).`,
  },
};

const input = "w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-[15px] text-[#0F2B4C] focus:outline-none focus:ring-2 focus:ring-[#F0A030]/50";

export function DemoScheduler({ open, onOpenChange, lang, waNumber }: { open: boolean; onOpenChange(v: boolean): void; lang: string; waNumber: string }) {
  const t = T[lang === "en" ? "en" : "es"];
  const [av, setAv] = useState<DemoAvailability | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [month, setMonth] = useState<string | null>(null); // "YYYY-MM"
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [step, setStep] = useState<"date" | "form" | "done">("date");
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", clientType: "", meeting: "virtual" as "virtual" | "presencial", notes: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoadError(false);
    setAv(null);
    fetchDemoAvailability().then(setAv).catch(() => setLoadError(true));
  }, [open]);

  // Horas sugeridas (según la duración de la cita) y todas las posibles cada 15 min ("otra hora")
  const suggested = useMemo(() => (av ? freeSlots(av) : new Map<string, number[]>()), [av]);
  const slots = useMemo(() => (av ? freeSlots(av, Date.now(), 15) : new Map<string, number[]>()), [av]);
  const firstDay = slots.keys().next().value as string | undefined;
  useEffect(() => {
    if (firstDay && !month) setMonth(firstDay.slice(0, 7));
  }, [firstDay, month]);

  function reset(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setTimeout(() => {
        setStep("date");
        setDay(null);
        setSlot(null);
        setError(null);
        setMonth(null);
      }, 300);
    }
  }

  async function submit() {
    if (!slot) return;
    setSending(true);
    setError(null);
    try {
      await bookDemo({ slot, ...form, lang });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      // Si la hora se ocupó, se recargan los horarios y se vuelve a elegir
      if (e instanceof Error && /reservada|booked|disponible|available/.test(e.message)) {
        fetchDemoAvailability().then(setAv).catch(() => undefined);
        setSlot(null);
        setStep("date");
      }
    }
    setSending(false);
  }

  // Calendario del mes: días con horas libres se pueden tocar
  const today = drDateKey(Date.now());
  const months = [...new Set([...slots.keys()].map((k) => k.slice(0, 7)))];
  const mIdx = month ? months.indexOf(month) : -1;
  const cells = useMemo(() => {
    if (!month) return [];
    const [y, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  }, [month]);

  const when = slot ? `${fmtDay(drDateKey(slot), lang)} · ${fmtTime(slot, lang)}` : "";
  const meetLabel = form.meeting === "virtual" ? t.virtual : t.presencial;

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0 max-h-[92vh] overflow-y-auto">
        <div className="bg-[#0F2B4C] text-white px-6 pt-6 pb-5">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="font-serif text-2xl flex items-center gap-2">
              <CalendarCheck className="text-[#F0A030]" size={24} /> {step === "done" ? t.done : t.title}
            </DialogTitle>
            <DialogDescription className="text-white/70">{step === "done" ? t.doneDesc : t.desc}</DialogDescription>
          </DialogHeader>
          {slot && step !== "date" && (
            <p className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-sm">
              <Clock size={14} className="text-[#F0A030]" /> <span className="first-letter:uppercase">{when}</span>
            </p>
          )}
        </div>

        <div className="p-6 text-[#0F2B4C]">
          {step === "date" && (
            <>
              {loadError ? (
                <p className="text-sm text-gray-600">{t.none}</p>
              ) : !av ? (
                <p className="py-10 flex items-center justify-center text-gray-500 text-sm"><Loader2 size={16} className="animate-spin mr-2" /> {t.loading}</p>
              ) : slots.size === 0 ? (
                <p className="text-sm text-gray-600">{t.none}</p>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#b8761a]">{t.pickDay}</p>
                      <div className="flex items-center gap-1">
                        <button type="button" disabled={mIdx <= 0} onClick={() => setMonth(months[mIdx - 1])} className="w-8 h-8 rounded-full hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center" aria-label="Anterior">
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-semibold first-letter:uppercase min-w-[120px] text-center">{month && fmtDay(`${month}-01`, lang, { month: "long", year: "numeric" })}</span>
                        <button type="button" disabled={mIdx < 0 || mIdx >= months.length - 1} onClick={() => setMonth(months[mIdx + 1])} className="w-8 h-8 rounded-full hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center" aria-label="Siguiente">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {t.week.map((w, i) => <span key={i} className="text-[11px] font-semibold text-gray-400 py-1">{w}</span>)}
                      {cells.map((key, i) =>
                        key ? (
                          <button
                            key={key}
                            type="button"
                            disabled={!slots.has(key)}
                            onClick={() => { setDay(key); setSlot(null); }}
                            className={cn(
                              "h-10 rounded-xl text-sm font-semibold transition-colors",
                              day === key ? "bg-[#0F2B4C] text-white" : slots.has(key) ? "bg-[#F0A030]/15 text-[#0F2B4C] hover:bg-[#F0A030]/35" : "text-gray-300",
                              key === today && day !== key && "ring-1 ring-[#0F2B4C]/30",
                            )}
                          >
                            {Number(key.slice(8))}
                          </button>
                        ) : <span key={`e${i}`} />,
                      )}
                    </div>
                  </div>
                  {day && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#b8761a] mb-2">
                        {t.pickTime} · <span className="normal-case tracking-normal font-semibold text-[#0F2B4C]">{fmtDay(day, lang)}</span>
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {suggested.get(day)?.map((ms) => (
                          <button
                            key={ms}
                            type="button"
                            onClick={() => setSlot(ms)}
                            className={cn("h-10 rounded-xl border text-sm font-semibold", slot === ms ? "bg-[#0F2B4C] text-white border-[#0F2B4C]" : "border-gray-200 hover:border-[#F0A030] hover:bg-amber-50")}
                          >
                            {fmtTime(ms, lang)}
                          </button>
                        ))}
                      </div>
                      <label className="mt-3 block">
                        <span className="text-xs font-semibold text-gray-600">{t.otherTime}</span>
                        <select
                          value={slot && !suggested.get(day)?.includes(slot) ? String(slot) : ""}
                          onChange={(e) => e.target.value && setSlot(Number(e.target.value))}
                          className={cn(input, "mt-1", slot && !suggested.get(day)?.includes(slot) && "border-[#0F2B4C] ring-2 ring-[#0F2B4C]/20 font-semibold")}
                        >
                          <option value="">{t.otherPh}</option>
                          {slots.get(day)?.map((ms) => <option key={ms} value={ms}>{fmtTime(ms, lang)}</option>)}
                        </select>
                      </label>
                    </div>
                  )}
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    type="button"
                    disabled={!slot}
                    onClick={() => { setError(null); setStep("form"); }}
                    className="w-full h-12 rounded-xl bg-[#F0A030] text-[#0F2B4C] font-semibold hover:bg-[#e5952a] disabled:opacity-40"
                  >
                    {t.next}
                  </button>
                </div>
              )}
            </>
          )}

          {step === "form" && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-gray-600">{t.name}</span>
                  <input required maxLength={120} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">{t.phone}</span>
                  <input required maxLength={40} type="tel" inputMode="tel" autoComplete="tel" placeholder="809 000 0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">{t.email}</span>
                  <input maxLength={160} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-gray-600">{t.company}</span>
                  <input maxLength={160} autoComplete="organization" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={input} />
                </label>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">{t.type}</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {t.types.map((o) => (
                    <button key={o} type="button" onClick={() => setForm({ ...form, clientType: o })} className={cn("px-3 py-2 rounded-xl border text-sm", form.clientType === o ? "border-[#F0A030] bg-amber-50 font-semibold" : "border-gray-200 text-gray-600")}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">{t.meeting}</span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {([["virtual", Video, t.virtual, t.virtualDesc], ["presencial", MapPin, t.presencial, t.presencialDesc]] as const).map(([v, Icon, label, d]) => (
                    <button key={v} type="button" onClick={() => setForm({ ...form, meeting: v })} className={cn("flex items-center gap-3 p-3 rounded-xl border text-left", form.meeting === v ? "border-[#F0A030] bg-amber-50" : "border-gray-200")}>
                      <Icon size={20} className="text-[#F0A030] shrink-0" />
                      <span>
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="block text-xs text-gray-500">{d}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">{t.notes}</span>
                <textarea maxLength={1000} rows={2} placeholder={t.notesPh} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={cn(input, "h-auto py-2")} />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep("date")} className="h-12 px-4 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">
                  {t.back}
                </button>
                <button type="submit" disabled={sending} className="flex-1 h-12 rounded-xl bg-[#0F2B4C] text-white font-semibold hover:bg-[#173a63] disabled:opacity-60 inline-flex items-center justify-center gap-2">
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t.book}
                </button>
              </div>
            </form>
          )}

          {step === "done" && slot && (
            <div className="space-y-3">
              <a
                href={whatsappLink(waNumber, t.waText(when, form.name.trim(), meetLabel))}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-xl bg-[#25D366] text-white font-semibold hover:brightness-110 inline-flex items-center justify-center gap-2"
              >
                <WhatsAppIcon size={18} /> {t.notify}
              </a>
              <a
                href={googleCalendarLink(t.calTitle, slot, av?.slot_minutes ?? 45, `${meetLabel} · Tours 360 · canaescapes.com/tours`)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-xl border border-gray-200 font-semibold hover:bg-gray-50 inline-flex items-center justify-center gap-2"
              >
                <CalendarPlus size={18} className="text-[#F0A030]" /> {t.calendar}
              </a>
              <button type="button" onClick={() => reset(false)} className="w-full h-11 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50">
                {t.close}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
