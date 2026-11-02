import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, BadgeDollarSign, CalendarClock, CalendarDays, Check, ClipboardList, ClipboardPaste, Copy, ExternalLink, FileText, FlaskConical, Link2, Loader2, Plus, Rotate3d, Search, Trash2, UserRoundSearch, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppIcon } from "@/components/cana/WhatsAppIcon";
import { ProspectDashboard } from "@/components/tours/ProspectDashboard";
import { ProspectMoney } from "@/components/tours/ProspectMoney";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { quoteNumber, usd } from "@/lib/tourPricing";
import {
  EVENT_KINDS, FOLLOWUP_DAYS, INTERESTS, KINDS, RECEIVED, SOURCES, STATUSES, TEMPLATES, ZONES,
  addEvent, daysSince, deleteProspect, emptyDraft, fillTemplate, followupOf, isDemo, label, loadEvents, loadProspects, parsePasted,
  prospectWhatsapp, resetDemo, saveMany, saveProspect, statusOf, suggestedTemplate, todayDR,
  loadLinkables, looksLike, raiseStatus, saleValue, setLink,
  type EventKind, type LinkTable, type Linkables, type Prospect, type ProspectDraft, type ProspectEvent, type Received, type Status,
} from "@/lib/tourProspects";

// Prospectos de Tours 360: a quién le hablaste, qué recibió, si respondió y cuál es el próximo paso.
// Es la hoja "Contactos" del Excel de seguimiento, hecha para llenarla desde el teléfono.

type Filter = "seguimiento" | "activos" | "cliente" | "no_interesa" | "todos";
type View = "resumen" | "prospectos" | "dinero";

/** Días que se suman al próximo paso cuando se manda un mensaje y aún no responde */
const NEXT_AFTER_MESSAGE_DAYS = 3;

function fail(title: string, e: unknown) {
  console.error(title, e);
  toast({ title, description: (e as { message?: string })?.message ?? String(e), variant: "destructive" });
}

const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("es-DO", { day: "numeric", month: "short" }) : "";

function StatusBadge({ status }: { status: Status }) {
  const s = statusOf(status);
  return <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", s.cls)}>{s.label}</span>;
}

export function AdminTourProspects() {
  const [list, setList] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("seguimiento");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ProspectDraft | null>(null);
  const [writing, setWriting] = useState<Prospect | null>(null);
  const [pasting, setPasting] = useState(false);
  const [links, setLinks] = useState<Linkables>(NO_LINKS);
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>(() => { const v = params.get("vista"); return v === "dinero" || v === "resumen" ? v : "prospectos"; });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await loadProspects();
      setList(rows);
      // ?abrir=<id> abre ese prospecto (por ejemplo, al volver de Precios o de Fichas)
      const open = params.get("abrir");
      const target = open && rows.find((p) => p.id === open);
      if (target) setEditing({ ...target });
      if (open) setParams({}, { replace: true });
    } catch (e) {
      fail("Error al cargar los prospectos", e);
    }
    setLoading(false);
    loadLinkables().then(setLinks, (e) => fail("Error al cargar cotizaciones, fichas, demos y tours", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  const today = todayDR();
  const withAlert = useMemo(() => list.map((p) => ({ p, alert: followupOf(p, today) })), [list, today]);
  const counts = useMemo(() => ({
    seguimiento: withAlert.filter((x) => x.alert).length,
    vencidos: withAlert.filter((x) => x.alert?.level === "vencido").length,
    activos: list.filter((p) => p.status !== "cliente" && p.status !== "no_interesa").length,
    cliente: list.filter((p) => p.status === "cliente").length,
    no_interesa: list.filter((p) => p.status === "no_interesa").length,
    todos: list.length,
  }), [withAlert, list]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rank = (a: ReturnType<typeof followupOf>) => (a?.level === "vencido" ? 0 : a?.level === "hoy" ? 1 : 2);
    return withAlert
      .filter(({ p, alert }) =>
        filter === "seguimiento" ? !!alert
          : filter === "activos" ? p.status !== "cliente" && p.status !== "no_interesa"
          : filter === "todos" ? true
          : p.status === filter)
      .filter(({ p }) => !q || [p.name, p.company, p.phone, p.notes, p.referred_by].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => rank(a.alert) - rank(b.alert)
        || (a.p.next_step_date ?? "9999").localeCompare(b.p.next_step_date ?? "9999")
        || b.p.updated_at.localeCompare(a.p.updated_at));
  }, [withAlert, filter, query]);

  function upsert(p: Prospect) {
    setList((l) => [p, ...l.filter((x) => x.id !== p.id)]);
  }

  /** Respondió: lo marca, pasa a "Respondió" y deja el contacto de hoy en la bitácora */
  async function markResponded(p: Prospect) {
    try {
      const saved = await saveProspect({ ...p, responded: true, last_contact_at: today, status: p.status === "enviado" || p.status === "por_contactar" ? "respondio" : p.status });
      await addEvent({ prospect_id: p.id, kind: "respuesta" });
      upsert(saved);
      toast({ title: `${p.name} respondió`, description: "Ponle el próximo paso cuando lo sepas." });
    } catch (e) { fail("No se pudo guardar", e); }
  }

  const FILTERS: [Filter, string, number][] = [
    ["seguimiento", "Para seguir", counts.seguimiento],
    ["activos", "Activos", counts.activos],
    ["cliente", "Clientes", counts.cliente],
    ["no_interesa", "No interesa", counts.no_interesa],
    ["todos", "Todos", counts.todos],
  ];

  return (
    <div className="px-3 sm:px-6 pt-6 pb-24 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
      <div className="max-w-screen-xl mx-auto space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserRoundSearch size={20} className="text-[#0F2B4C]" />
            <div>
              <h1 className="text-xl font-bold text-[#0F2B4C]">Prospectos · Tours 360</h1>
              <p className="text-xs text-gray-500">A quién le hablaste, qué recibió y cuál es el próximo paso.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPasting(true)}><ClipboardPaste size={14} className="mr-1.5" /> Pegar desde Excel</Button>
            <Button size="sm" className="bg-[#0F2B4C] hover:bg-[#173a63]" onClick={() => setEditing(emptyDraft())}><Plus size={15} className="mr-1" /> Nuevo prospecto</Button>
            <Link to="/admin/tours" className="hidden sm:inline-flex items-center gap-1.5 text-[#0F2B4C] font-semibold hover:text-[#b8761a]"><Rotate3d size={15} /> Tours 360</Link>
          </div>
        </div>

        {isDemo() && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <FlaskConical size={14} />
            <span className="flex-1 min-w-[200px]"><b>Modo prueba:</b> la tabla de prospectos todavía no existe en Supabase, así que esto son datos de ejemplo guardados solo en este navegador.</span>
            <button className="underline font-semibold" onClick={() => { resetDemo(); load(); }}>Reiniciar ejemplo</button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-white border border-gray-200 p-1 max-w-md">
          {([["resumen", "Resumen"], ["prospectos", "Prospectos"], ["dinero", "Dinero y visitas"]] as [View, string][]).map(([k, name]) => (
            <button key={k} onClick={() => setView(k)} className={cn("rounded-lg py-2 text-xs font-bold", view === k ? "bg-[#0F2B4C] text-white" : "text-[#0F2B4C]")}>{name}</button>
          ))}
        </div>

        {view === "resumen" ? <ProspectDashboard prospects={list} links={links} /> : view === "dinero" ? <ProspectMoney prospects={list} links={links} /> : (
          <>
          {counts.vencidos > 0 && (
            <button onClick={() => setFilter("seguimiento")} className="w-full flex items-center gap-2 text-left rounded-xl bg-red-50 border border-red-200 text-red-800 px-3 py-2.5">
              <AlertTriangle size={16} className="shrink-0" />
              <span><b>{counts.vencidos}</b> {counts.vencidos === 1 ? "seguimiento vencido" : "seguimientos vencidos"}: {FOLLOWUP_DAYS}+ días sin respuesta o el próximo paso ya pasó.</span>
            </button>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {FILTERS.map(([k, name, n]) => (
              <button
                key={k} onClick={() => setFilter(k)}
                className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold", filter === k ? "bg-[#0F2B4C] text-white border-[#0F2B4C]" : "bg-white border-gray-200 text-[#0F2B4C]")}
              >
                {name} <span className={cn("ml-1", filter === k ? "text-white/70" : "text-gray-400")}>{n}</span>
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3">
            <Search size={15} className="text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, empresa, teléfono o nota" className="flex-1 h-10 bg-transparent outline-none" />
            {query && <button onClick={() => setQuery("")} aria-label="Borrar búsqueda"><X size={15} className="text-gray-400" /></button>}
          </label>

          {loading ? (
            <p className="text-gray-500 flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Cargando…</p>
          ) : shown.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
              <UserRoundSearch size={34} className="mx-auto mb-3 text-gray-300" />
              {filter === "seguimiento" && list.length ? "Nada pendiente. Todos tus seguimientos están al día." : "Nadie por aquí todavía. Agrega un prospecto o pega las filas de tu Excel."}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map(({ p, alert }) => {
                const quiet = daysSince(p.last_contact_at, today);
                return (
                  <div key={p.id} className={cn("bg-white rounded-xl border p-3 space-y-2", alert?.level === "vencido" ? "border-red-300" : alert ? "border-amber-300" : "border-gray-200")}>
                    <button className="w-full text-left space-y-1" onClick={() => setEditing({ ...p })}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-[#0F2B4C] truncate">{p.name || "Sin nombre"}</p>
                          <p className="text-xs text-gray-500 truncate">{[p.company, label(KINDS, p.kind), label(ZONES, p.zone)].filter(Boolean).join(" · ") || "—"}</p>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                      {alert && (
                        <p className={cn("text-xs font-semibold flex items-center gap-1", alert.level === "vencido" ? "text-red-700" : "text-amber-700")}>
                          <AlertTriangle size={12} /> {alert.reason}
                        </p>
                      )}
                      {p.next_step && (
                        <p className="text-xs text-gray-700 flex items-center gap-1">
                          <CalendarClock size={12} className="text-gray-400 shrink-0" />
                          <span className="truncate">{p.next_step}</span>
                          {p.next_step_date && <span className="text-gray-400 shrink-0">· {p.next_step_date === today ? "hoy" : fmtDate(p.next_step_date)}</span>}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
                        {p.received.map((r) => <span key={r} className="rounded bg-gray-100 px-1.5 py-0.5">{label(RECEIVED, r)}</span>)}
                        {p.interest && <span className={cn("rounded px-1.5 py-0.5", p.interest === "alto" ? "bg-green-50 text-green-700" : p.interest === "medio" ? "bg-amber-50 text-amber-700" : "bg-gray-50")}>Interés {label(INTERESTS, p.interest).toLowerCase()}</span>}
                        {quiet !== null && <span>{quiet === 0 ? "contacto hoy" : `${quiet} ${quiet === 1 ? "día" : "días"} sin contacto`}</span>}
                      </div>
                      <LinkedLine p={p} links={links} />
                    </button>
                    <div className="flex gap-2 pt-1 border-t border-gray-100">
                      <Button size="sm" variant="outline" className="flex-1 text-green-700 border-green-200" onClick={() => setWriting(p)}>
                        <WhatsAppIcon size={14} className="mr-1.5" /> WhatsApp
                      </Button>
                      {!p.responded && p.status !== "por_contactar" && p.status !== "no_interesa" && p.status !== "cliente" && (
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => markResponded(p)}><Check size={14} className="mr-1.5" /> Respondió</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </>
        )}
      </div>

      {editing && (
        <ProspectEditor
          key={editing.id ?? "nuevo"}
          draft={editing}
          all={list}
          links={links}
          onLinksChange={setLinks}
          onClose={() => setEditing(null)}
          onSaved={(p) => { upsert(p); setEditing(null); }}
          onDeleted={(id) => { setList((l) => l.filter((x) => x.id !== id)); setEditing(null); }}
          onWrite={(p) => { setEditing(null); setWriting(p); }}
        />
      )}
      {writing && <WhatsAppDialog prospect={writing} onClose={() => setWriting(null)} onSent={(p) => { upsert(p); setWriting(null); }} />}
      {pasting && <PasteDialog onClose={() => setPasting(false)} onImported={(rows) => { setList((l) => [...rows, ...l]); setPasting(false); setFilter("todos"); }} />}
    </div>
  );
}

// ── Hoja inferior (en el teléfono) para crear o editar ────────────────────────────────────────────
const SHEET = "top-auto bottom-0 translate-y-0 data-[state=open]:slide-in-from-top-[100%] max-h-[92dvh] overflow-y-auto rounded-t-2xl rounded-b-none p-4 sm:p-6 sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:rounded-2xl max-w-2xl";

function Field({ label: name, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{name}</span>
      {children}
    </label>
  );
}

function Select<K extends string>({ value, onChange, options, placeholder = "—" }: { value: K | null; onChange: (v: K | null) => void; options: { key: K; label: string }[]; placeholder?: string }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange((e.target.value || null) as K | null)} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );
}

function Chips<K extends string>({ value, onChange, options, multi }: { value: K[]; onChange: (v: K[]) => void; options: { key: K; label: string; cls?: string }[]; multi?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.key);
        return (
          <button
            key={o.key} type="button"
            onClick={() => onChange(multi ? (on ? value.filter((v) => v !== o.key) : [...value, o.key]) : [o.key])}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", on ? "border-[#F0A030] bg-[#FCEBD0] text-[#0F2B4C]" : "border-gray-200 bg-white text-gray-600")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ProspectEditor({ draft, all, links, onLinksChange, onClose, onSaved, onDeleted, onWrite }: {
  draft: ProspectDraft; all: Prospect[]; links: Linkables; onLinksChange: (l: Linkables) => void; onClose: () => void; onSaved: (p: Prospect) => void; onDeleted: (id: string) => void; onWrite: (p: Prospect) => void;
}) {
  const [d, setD] = useState<ProspectDraft>(draft);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<ProspectEvent[]>([]);
  const [newEvent, setNewEvent] = useState<{ kind: EventKind; note: string; on: string }>({ kind: "whatsapp", note: "", on: todayDR() });
  const set = <K extends keyof ProspectDraft>(k: K, v: ProspectDraft[K]) => setD((o) => ({ ...o, [k]: v }));
  const today = todayDR();

  useEffect(() => {
    if (draft.id) loadEvents(draft.id).then(setEvents, (e) => fail("Error al cargar la bitácora", e));
  }, [draft.id]);

  async function save() {
    if (!d.name.trim()) return toast({ title: "Falta el nombre", variant: "destructive" });
    setSaving(true);
    try {
      // Si ya va en Respondió o más adelante, es que respondió
      const answered = d.responded || ["respondio", "demo", "propuesta", "cliente"].includes(d.status);
      const saved = await saveProspect({ ...d, name: d.name.trim(), responded: answered });
      if (draft.id && draft.status !== d.status) {
        await addEvent({ prospect_id: saved.id, kind: "estado", note: `${statusOf(draft.status).label} → ${statusOf(d.status).label}` });
      }
      toast({ title: draft.id ? "Prospecto guardado" : "Prospecto agregado" });
      onSaved(saved);
    } catch (e) {
      fail("No se pudo guardar", e);
    }
    setSaving(false);
  }

  async function remove() {
    if (!draft.id || !confirm(`¿Borrar a ${draft.name} y su bitácora?`)) return;
    try {
      await deleteProspect(draft.id);
      toast({ title: "Prospecto borrado" });
      onDeleted(draft.id);
    } catch (e) { fail("No se pudo borrar", e); }
  }

  /** Anota un contacto en la bitácora; si es de hoy o más nuevo, también cuenta como último contacto */
  async function logEvent() {
    if (!draft.id) return;
    try {
      const ev = await addEvent({ prospect_id: draft.id, kind: newEvent.kind, note: newEvent.note.trim() || null, happened_on: newEvent.on });
      setEvents((l) => [ev, ...l].sort((a, b) => b.happened_on.localeCompare(a.happened_on)));
      const contact = newEvent.kind !== "nota" && newEvent.kind !== "estado";
      if (contact && (!d.last_contact_at || newEvent.on > d.last_contact_at)) set("last_contact_at", newEvent.on);
      if (newEvent.kind === "respuesta") set("responded", true);
      setNewEvent({ kind: newEvent.kind, note: "", on: today });
      toast({ title: "Anotado en la bitácora", description: contact ? "Guarda para que cuente como último contacto." : undefined });
    } catch (e) { fail("No se pudo anotar", e); }
  }

  const quiet = daysSince(d.last_contact_at, today);
  const others = all.filter((p) => p.id !== draft.id);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={SHEET} onOpenAutoFocus={(e) => draft.id && e.preventDefault()}>
        <DialogTitle className="text-lg font-bold text-[#0F2B4C] pr-8">{draft.id ? draft.name || "Prospecto" : "Nuevo prospecto"}</DialogTitle>

        <div className="space-y-5 text-sm">
          <section className="grid grid-cols-2 gap-3">
            <Field label="Nombre" className="col-span-2"><Input value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Persona o negocio" autoFocus={!draft.id} /></Field>
            <Field label="Empresa"><Input value={d.company ?? ""} onChange={(e) => set("company", e.target.value || null)} /></Field>
            <Field label="Tipo"><Select value={d.kind} onChange={(v) => set("kind", v)} options={KINDS} /></Field>
            <Field label="Teléfono / WhatsApp"><Input type="tel" inputMode="tel" value={d.phone ?? ""} onChange={(e) => set("phone", e.target.value || null)} placeholder="809 555 1234" /></Field>
            <Field label="Zona"><Select value={d.zone} onChange={(v) => set("zone", v)} options={ZONES} /></Field>
            <Field label="Cómo llegó"><Select value={d.source} onChange={(v) => set("source", v)} options={SOURCES} /></Field>
            <Field label="Referido por">
              <Input list="prospect-names" value={d.referred_by ?? ""} placeholder="Nombre"
                onChange={(e) => {
                  const v = e.target.value;
                  const match = others.find((p) => p.name.toLowerCase() === v.trim().toLowerCase());
                  setD((o) => ({ ...o, referred_by: v || null, referred_by_id: match?.id ?? null }));
                }} />
              <datalist id="prospect-names">{others.map((p) => <option key={p.id} value={p.name} />)}</datalist>
            </Field>
            <Field label="Correo" className="col-span-2"><Input type="email" inputMode="email" value={d.email ?? ""} onChange={(e) => set("email", e.target.value || null)} /></Field>
          </section>

          <section className="space-y-3">
            <Field label="Estado"><Chips value={[d.status]} onChange={(v) => set("status", v[0])} options={STATUSES} /></Field>
            <Field label="Qué recibió (puede ser varias)"><Chips multi value={d.received} onChange={(v) => set("received", v as Received[])} options={RECEIVED} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha 1er envío"><Input type="date" value={d.first_sent_at ?? ""} onChange={(e) => set("first_sent_at", e.target.value || null)} /></Field>
              <Field label={`Último contacto${quiet !== null ? ` · hace ${quiet} d` : ""}`}>
                <div className="flex gap-1">
                  <Input type="date" value={d.last_contact_at ?? ""} onChange={(e) => set("last_contact_at", e.target.value || null)} />
                  <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => set("last_contact_at", today)}>Hoy</Button>
                </div>
              </Field>
              <label className="flex items-center gap-2 pt-5"><Switch checked={d.responded} onCheckedChange={(v) => set("responded", v)} /> ¿Respondió?</label>
              <Field label="Nº de propiedades"><Input type="number" inputMode="numeric" min={0} value={d.properties ?? ""} onChange={(e) => set("properties", e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value))))} /></Field>
            </div>
            <Field label="Interés"><Chips value={d.interest ? [d.interest] : []} onChange={(v) => set("interest", v[0] === d.interest ? null : v[0])} options={INTERESTS} /></Field>
          </section>

          <section className="space-y-2 rounded-xl bg-[#f5f8fc] border border-gray-200 p-3">
            <Field label="Próximo paso"><Input value={d.next_step ?? ""} onChange={(e) => set("next_step", e.target.value || null)} placeholder="Ej.: Mensaje 5 (seguimiento), llamar, visitar oficina" /></Field>
            <div className="flex flex-wrap items-center gap-1.5">
              <Input type="date" className="w-auto" value={d.next_step_date ?? ""} onChange={(e) => set("next_step_date", e.target.value || null)} aria-label="Fecha del próximo paso" />
              {[["Hoy", 0], ["Mañana", 1], ["+3 días", 3], ["+1 semana", 7]].map(([t, n]) => (
                <Button key={t} type="button" variant="outline" size="sm" onClick={() => set("next_step_date", addDays(today, n as number))}>{t}</Button>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Field label="Cotizado US$ (a mano)"><Input type="number" inputMode="decimal" min={0} value={d.quoted_usd ?? ""} onChange={(e) => set("quoted_usd", e.target.value === "" ? null : Number(e.target.value))} /></Field>
            <Field label="Vendido US$ (a mano)"><Input type="number" inputMode="decimal" min={0} value={d.sold_usd ?? ""} onChange={(e) => set("sold_usd", e.target.value === "" ? null : Number(e.target.value))} /></Field>
            <Field label="Notas" className="col-span-2"><Textarea rows={3} value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} /></Field>
          </section>

          {draft.id && (
            <Connections
              prospect={{ ...(draft as Prospect), ...d } as Prospect}
              links={links}
              onLinksChange={onLinksChange}
              onEvent={(ev) => setEvents((l) => [ev, ...l])}
              onStatus={(to, why) => {
                const next = raiseStatus(d.status, to);
                if (next !== d.status) {
                  set("status", next);
                  toast({ title: `Estado: ${statusOf(next).label}`, description: `${why} Toca Guardar para dejarlo así.` });
                }
              }}
            />
          )}

          {draft.id && (
            <section className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Bitácora</p>
              <div className="flex flex-wrap gap-1.5">
                <select value={newEvent.kind} onChange={(e) => setNewEvent((o) => ({ ...o, kind: e.target.value as EventKind }))} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                  {EVENT_KINDS.filter((k) => k.key !== "estado").map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                </select>
                <Input type="date" className="h-9 w-auto" value={newEvent.on} onChange={(e) => setNewEvent((o) => ({ ...o, on: e.target.value || today }))} aria-label="Fecha" />
                <Input className="h-9 flex-1 min-w-[140px]" placeholder="Qué pasó (opcional)" value={newEvent.note} onChange={(e) => setNewEvent((o) => ({ ...o, note: e.target.value }))} />
                <Button type="button" size="sm" variant="outline" onClick={logEvent}><Plus size={14} className="mr-1" /> Anotar</Button>
              </div>
              {events.length ? (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {events.map((ev) => (
                    <li key={ev.id} className="px-3 py-2 text-xs flex gap-2">
                      <span className="text-gray-400 w-14 shrink-0">{fmtDate(ev.happened_on)}</span>
                      <span className="font-semibold text-[#0F2B4C] shrink-0">{label(EVENT_KINDS, ev.kind)}{ev.template ? ` · msj ${ev.template.slice(1)}` : ""}</span>
                      {ev.note && <span className="text-gray-600">{ev.note}</span>}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-gray-400">Sin contactos anotados todavía.</p>}
            </section>
          )}
        </div>

        <div className="sticky -bottom-4 sm:-bottom-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background border-t border-gray-100 flex flex-wrap gap-2">
          {draft.id && <Button type="button" variant="outline" size="sm" className="text-red-600" onClick={remove}><Trash2 size={14} /></Button>}
          {draft.id && (
            <Button type="button" variant="outline" size="sm" className="text-green-700" onClick={() => onWrite({ ...(draft as Prospect), ...d } as Prospect)}>
              <WhatsAppIcon size={14} className="mr-1.5" /> WhatsApp
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="outline" size="sm" className="hidden sm:inline-flex" onClick={onClose}>Cancelar</Button>
          <Button type="button" size="sm" className="bg-[#0F2B4C] hover:bg-[#173a63] px-5" onClick={save} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin mr-1.5" />} Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Conectado con: cotizaciones, ventas, ficha, demo y tour ─────────────────────────────────────
const NO_LINKS: Linkables = { quotes: [], sales: [], intakes: [], demos: [], tours: [] };
const LINK_NAME: Record<LinkTable, string> = { tour_quotes: "cotización", tour_sales: "venta", tour_intakes: "ficha", tour_demo_bookings: "demo", tours: "tour" };
const LINK_KEY: Record<LinkTable, keyof Linkables> = { tour_quotes: "quotes", tour_sales: "sales", tour_intakes: "intakes", tour_demo_bookings: "demos", tours: "tours" };

const fmtShort = (iso: string) => new Date(iso).toLocaleDateString("es-DO", { day: "numeric", month: "short" });
const linkedTo = <T extends { prospect_id: string | null }>(l: T[], id: string) => l.filter((x) => x.prospect_id === id);

/** Línea corta en la tarjeta con lo que ya tiene ligado */
function LinkedLine({ p, links }: { p: Prospect; links: Linkables }) {
  const quotes = linkedTo(links.quotes, p.id), sales = linkedTo(links.sales, p.id), tours = linkedTo(links.tours, p.id);
  const parts = [
    quotes.length ? `${quotes.length} ${quotes.length === 1 ? "cotización" : "cotizaciones"}` : "",
    sales.length ? `vendido ${usd(sales.reduce((a, x) => a + saleValue(x), 0))}` : "",
    linkedTo(links.intakes, p.id).length ? "ficha" : "",
    linkedTo(links.demos, p.id).length ? "demo" : "",
    tours.length ? `${tours.filter((t) => t.published).length} de ${tours.length} ${tours.length === 1 ? "tour publicado" : "tours publicados"}` : "",
  ].filter(Boolean);
  if (!parts.length) return null;
  return <p className="text-[11px] text-[#0F2B4C] flex items-center gap-1"><Link2 size={11} className="text-gray-400" /> {parts.join(" · ")}</p>;
}

type Row = { id: string; title: string; sub: string; href?: string; suggested: boolean };

function LinkBlock({ icon: Icon, title, linked, options, onLink, onUnlink, action }: {
  icon: typeof FileText; title: string; linked: Row[]; options: Row[];
  onLink: (id: string) => void; onUnlink: (id: string) => void; action?: React.ReactNode;
}) {
  const sorted = [...options].sort((a, b) => Number(b.suggested) - Number(a.suggested));
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#0F2B4C] flex items-center gap-1.5"><Icon size={13} /> {title}</p>
        {action}
      </div>
      {linked.map((r) => (
        <div key={r.id} className="flex items-center gap-2 text-xs bg-[#f5f8fc] rounded-md px-2 py-1.5">
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{r.title}</p>
            {r.sub && <p className="text-gray-500 truncate">{r.sub}</p>}
          </div>
          {r.href && <a href={r.href} target={r.href.startsWith("/tour/") ? "_blank" : undefined} rel="noreferrer" className="text-gray-400 hover:text-[#0F2B4C]" aria-label="Abrir"><ExternalLink size={13} /></a>}
          <button type="button" onClick={() => onUnlink(r.id)} className="text-gray-400 hover:text-red-600" aria-label="Quitar enlace"><X size={14} /></button>
        </div>
      ))}
      {sorted.length > 0 && (
        <select value="" onChange={(e) => e.target.value && onLink(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs text-gray-600">
          <option value="">{linked.length ? "Ligar otra…" : "Ligar una que ya existe…"}</option>
          {sorted.map((r) => <option key={r.id} value={r.id}>{r.suggested ? "★ " : ""}{r.title}{r.sub ? ` · ${r.sub}` : ""}</option>)}
        </select>
      )}
      {!linked.length && !sorted.length && <p className="text-[11px] text-gray-400">Nada que ligar todavía.</p>}
    </div>
  );
}

function Connections({ prospect: p, links, onLinksChange, onStatus, onEvent }: {
  prospect: Prospect; links: Linkables; onLinksChange: (l: Linkables) => void; onStatus: (to: Status, why: string) => void; onEvent: (ev: ProspectEvent) => void;
}) {
  const navigate = useNavigate();
  const free = <T extends { prospect_id: string | null }>(l: T[]) => l.filter((x) => !x.prospect_id);
  const mine = <T extends { prospect_id: string | null }>(l: T[]) => linkedTo(l, p.id);

  async function link(table: LinkTable, id: string, on: boolean) {
    try {
      await setLink(table, id, on ? p.id : null);
      const k = LINK_KEY[table];
      onLinksChange({ ...links, [k]: (links[k] as { id: string; prospect_id: string | null }[]).map((x) => (x.id === id ? { ...x, prospect_id: on ? p.id : null } : x)) });
      if (!on) return;
      onEvent(await addEvent({ prospect_id: p.id, kind: "nota", note: `Ligado: ${LINK_NAME[table]}` }));
      if (table === "tour_quotes") onStatus("propuesta", "Tiene una cotización.");
      if (table === "tour_demo_bookings") onStatus("demo", "Tiene una demostración.");
      if (table === "tour_sales") onStatus("cliente", "Ya compró.");
    } catch (e) { fail("No se pudo ligar", e); }
  }

  const quoteRow = (q: Linkables["quotes"][number]): Row => ({
    id: q.id, title: `${quoteNumber(q.number, q.created_at)} · ${usd(q.total_usd)}`, sub: [q.client_name || q.data?.client?.company, q.status].filter(Boolean).join(" · "),
    href: "/admin/tours/precios", suggested: looksLike(p, [q.data?.client?.phone], [q.client_name, q.data?.client?.company]),
  });
  const saleRow = (x: Linkables["sales"][number]): Row => ({
    id: x.id, title: `${x.client_name || "Venta"} · ${usd(saleValue(x))}`,
    sub: `${fmtDate(x.sale_date)} · ${x.pay === "suscripcion" ? `suscripción ${usd(x.monthly_usd)}/mes` : "pago único"}${x.status === "cancelada" ? " · cancelada" : ""}`,
    suggested: looksLike(p, [], [x.client_name]) || (!!x.quote_id && mine(links.quotes).some((q) => q.id === x.quote_id)),
  });
  const intakeRow = (x: Linkables["intakes"][number]): Row => ({
    id: x.id, title: x.company || x.client_name || "Ficha sin nombre", sub: [x.property_name, fmtShort(x.created_at)].filter(Boolean).join(" · "),
    href: `/admin/tours/fichas?ficha=${x.id}`, suggested: looksLike(p, [x.data?.cliente_telefono, x.data?.cliente_whatsapp], [x.client_name, x.company]),
  });
  const demoRow = (x: Linkables["demos"][number]): Row => ({
    id: x.id, title: `${x.name}${x.company ? ` · ${x.company}` : ""}`,
    sub: `${new Date(x.slot_start).toLocaleString("es-DO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · ${x.status}`,
    href: "/admin/tours/agenda", suggested: looksLike(p, [x.phone], [x.name, x.company]),
  });
  const tourRow = (x: Linkables["tours"][number]): Row => ({
    id: x.id, title: x.title, sub: `${x.published ? "Publicado" : "Borrador"} · /tour/${x.slug}`, href: `/tour/${x.slug}`,
    suggested: looksLike(p, [], [x.title, x.property_name]),
  });
  // En modo prueba no se crean cotizaciones ni fichas: irían a la base real con un prospecto de ejemplo
  const create = (label: string, to: string) => isDemo()
    ? <span className="text-[10px] text-gray-400">{label}: al aplicar la migración</span>
    : <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => navigate(to)}><Plus size={12} className="mr-1" /> {label}</Button>;

  return (
    <section className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Conectado con</p>
      <div className="grid sm:grid-cols-2 gap-2">
        <LinkBlock
          icon={FileText} title="Cotizaciones" linked={mine(links.quotes).map(quoteRow)} options={free(links.quotes).map(quoteRow)}
          onLink={(id) => link("tour_quotes", id, true)} onUnlink={(id) => link("tour_quotes", id, false)}
          action={create("Cotizar", `/admin/tours/precios?prospecto=${p.id}`)}
        />
        <LinkBlock
          icon={BadgeDollarSign} title="Ventas" linked={mine(links.sales).map(saleRow)} options={free(links.sales).map(saleRow)}
          onLink={(id) => link("tour_sales", id, true)} onUnlink={(id) => link("tour_sales", id, false)}
        />
        <LinkBlock
          icon={ClipboardList} title="Ficha del cliente" linked={mine(links.intakes).map(intakeRow)} options={free(links.intakes).map(intakeRow)}
          onLink={(id) => link("tour_intakes", id, true)} onUnlink={(id) => link("tour_intakes", id, false)}
          action={create("Crear ficha", `/admin/tours/fichas?prospecto=${p.id}`)}
        />
        <LinkBlock
          icon={CalendarDays} title="Demostración" linked={mine(links.demos).map(demoRow)} options={free(links.demos).map(demoRow)}
          onLink={(id) => link("tour_demo_bookings", id, true)} onUnlink={(id) => link("tour_demo_bookings", id, false)}
        />
        <LinkBlock
          icon={Rotate3d} title="Tours" linked={mine(links.tours).map(tourRow)} options={free(links.tours).map(tourRow)}
          onLink={(id) => link("tours", id, true)} onUnlink={(id) => link("tours", id, false)}
        />
      </div>
      <p className="text-[11px] text-gray-400">★ = parece de esta persona (mismo teléfono o nombre). Las ventas se registran en Precios.</p>
    </section>
  );
}

// ── Mensaje por WhatsApp con las plantillas del kit ─────────────────────────────────────────────
function WhatsAppDialog({ prospect: p, onClose, onSent }: { prospect: Prospect; onClose: () => void; onSent: (p: Prospect) => void }) {
  const [tpl, setTpl] = useState(suggestedTemplate(p));
  const [text, setText] = useState(() => fillTemplate(TEMPLATES.find((t) => t.key === suggestedTemplate(p))!.text, p));
  const link = prospectWhatsapp(p, text);
  const pending = /\[[^\]]+\]/.test(text);

  function choose(key: string) {
    setTpl(key);
    setText(fillTemplate(TEMPLATES.find((t) => t.key === key)!.text, p));
  }

  /** Lo que se mandó cuenta como contacto: bitácora, último contacto, estado y el próximo seguimiento */
  async function register() {
    const today = todayDR();
    const received: Received[] = text.includes("canaescapes.com/tours") && !p.received.includes("link") ? [...p.received, "link"] : p.received;
    const waiting = !p.responded;
    try {
      await addEvent({ prospect_id: p.id, kind: "whatsapp", template: tpl });
      const saved = await saveProspect({
        ...p,
        received,
        first_sent_at: p.first_sent_at ?? today,
        last_contact_at: today,
        status: p.status === "por_contactar" ? "enviado" : p.status,
        ...(waiting ? { next_step: "Mensaje 5 (seguimiento)", next_step_date: addDays(today, NEXT_AFTER_MESSAGE_DAYS) } : {}),
      });
      toast({ title: "Mensaje anotado", description: waiting ? `Seguimiento puesto para dentro de ${NEXT_AFTER_MESSAGE_DAYS} días.` : undefined });
      onSent(saved);
    } catch (e) { fail("No se pudo anotar el mensaje", e); }
  }

  function copy() {
    navigator.clipboard?.writeText(text).then(
      () => toast({ title: "Mensaje copiado" }),
      () => toast({ title: "No se pudo copiar", variant: "destructive" }),
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={SHEET}>
        <DialogTitle className="text-lg font-bold text-[#0F2B4C] pr-8">WhatsApp a {p.name}</DialogTitle>
        <div className="space-y-3 text-sm">
          <select value={tpl} onChange={(e) => choose(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-2">
            {TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
          </select>
          <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} />
          {pending && <p className="text-xs text-amber-700">Cambia lo que está entre [corchetes] antes de mandarlo.</p>}
          {!link && <p className="text-xs text-gray-500">Este prospecto no tiene teléfono: copia el mensaje y mándalo tú.</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copy}><Copy size={14} className="mr-1.5" /> Copiar</Button>
            <div className="flex-1" />
            {link ? (
              <a href={link} target="_blank" rel="noreferrer" onClick={register} className="inline-flex items-center justify-center h-9 px-3 rounded-md bg-[#25D366] text-white font-semibold hover:bg-[#1ebe5a]">
                <WhatsAppIcon size={15} className="mr-1.5" /> Abrir WhatsApp
              </a>
            ) : (
              <Button type="button" size="sm" className="bg-[#0F2B4C]" onClick={register}>Ya lo mandé</Button>
            )}
          </div>
          <p className="text-[11px] text-gray-400">Al abrir WhatsApp queda anotado como contacto de hoy y, si aún no responde, el seguimiento se pone para dentro de {NEXT_AFTER_MESSAGE_DAYS} días.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Pegar filas de la hoja "Contactos" ───────────────────────────────────────────────────────────
function PasteDialog({ onClose, onImported }: { onClose: () => void; onImported: (rows: Prospect[]) => void }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const parsed = useMemo(() => parsePasted(text), [text]);

  async function importRows() {
    setSaving(true);
    try {
      const rows = await saveMany(parsed.rows);
      toast({ title: `${rows.length} ${rows.length === 1 ? "prospecto importado" : "prospectos importados"}` });
      onImported(rows);
    } catch (e) { fail("No se pudo importar", e); }
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={SHEET}>
        <DialogTitle className="text-lg font-bold text-[#0F2B4C] pr-8">Pegar desde Excel</DialogTitle>
        <div className="space-y-3 text-sm">
          <ol className="text-xs text-gray-600 list-decimal pl-4 space-y-0.5">
            <li>En el Excel, hoja <b>Contactos</b>, selecciona las filas (de la columna Nombre a Notas). Puedes incluir la fila de títulos.</li>
            <li>Cópialas (Ctrl+C) y pégalas aquí abajo (Ctrl+V).</li>
            <li>Revisa la lista y toca <b>Importar</b>.</li>
          </ol>
          <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Pega aquí las filas…" className="font-mono text-xs" />
          {text.trim() && (
            <div className="rounded-lg border border-gray-200 max-h-56 overflow-y-auto">
              {parsed.rows.length ? (
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-gray-100">
                    {parsed.rows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5 font-semibold text-[#0F2B4C]">{r.name}</td>
                        <td className="px-2 py-1.5 text-gray-500">{[r.company, label(KINDS, r.kind)].filter(Boolean).join(" · ")}</td>
                        <td className="px-2 py-1.5"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="p-3 text-xs text-gray-500">No encontré filas con nombre.</p>}
              {parsed.skipped > 0 && <p className="px-2 py-1.5 text-[11px] text-gray-400 border-t">{parsed.skipped} filas sin nombre se saltaron.</p>}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="button" size="sm" className="bg-[#0F2B4C] hover:bg-[#173a63]" disabled={!parsed.rows.length || saving} onClick={importRows}>
              {saving && <Loader2 size={14} className="animate-spin mr-1.5" />} Importar {parsed.rows.length || ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
