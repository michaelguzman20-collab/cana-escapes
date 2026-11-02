import { useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight, Download, Eye, Filter, Loader2, Plus, Target, Trash2, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usd } from "@/lib/tourPricing";
import {
  KINDS, RECEIVED, REACHED, SOURCES, addDaysIso, breakdown, followupOf, inRange, loadEvents, loadExpenses, loadTourVisits, loadWeek, mondayOf, prospectMoney,
  saleIncomeIn, saveWeek, todayDR, weekProgress,
  type Expense, type Linkables, type Prospect, type ProspectEvent, type TourVisits, type TourWeek, type WeekTask,
} from "@/lib/tourProspects";
import { ProspectReports } from "./ProspectReports";

// Resumen de Tours 360: el "Dashboard" y el "Avance" del Excel de seguimiento, calculados solos con
// los prospectos, su bitácora, las ventas, los gastos y las visitas.

/** Semanas en "Contactos por semana" y meses en "Ingresos contra gastos" */
const WEEKS_SHOWN = 8;
const MONTHS_SHOWN = 6;
/** Mínimo de contactos de un grupo para marcarlo como "el que mejor funciona" */
const MIN_FOR_BEST = 2;

function fail(title: string, e: unknown) {
  console.error(title, e);
  toast({ title, description: (e as { message?: string })?.message ?? String(e), variant: "destructive" });
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const shortDay = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("es-DO", { day: "numeric", month: "short" });
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function Card({ icon: Icon, title, desc, action, children, className }: { icon: typeof Target; title: string; desc?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 space-y-3", className)}>
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

function Kpi({ label, value, hint, alert }: { label: string; value: string; hint?: string; alert?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-3", alert ? "bg-red-50 border-red-200" : "bg-white border-gray-200")}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 leading-tight">{label}</p>
      <p className={cn("text-xl font-bold tabular-nums", alert ? "text-red-700" : "text-[#0F2B4C]")}>{value}</p>
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  return <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden"><div className={cn("h-full rounded-full", className ?? "bg-[#0F2B4C]")} style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} /></div>;
}

export function ProspectDashboard({ prospects, links }: { prospects: Prospect[]; links: Linkables }) {
  const [events, setEvents] = useState<ProspectEvent[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [visits, setVisits] = useState<Map<string, TourVisits>>(new Map());
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState(false);
  const today = todayDR();

  useEffect(() => {
    Promise.all([loadEvents(), loadExpenses(), loadTourVisits(30)])
      .then(([e, x, v]) => { setEvents(e); setExpenses(x); setVisits(v); })
      .catch((e) => fail("Error al cargar el resumen", e))
      .finally(() => setLoading(false));
  }, []);

  const k = useMemo(() => {
    const received = prospects.filter((p) => p.received.length > 0 || p.status !== "por_contactar");
    const responded = prospects.filter((p) => p.responded);
    const reached = prospects.filter((p) => REACHED.includes(p.status));
    const clients = prospects.filter((p) => p.status === "cliente");
    const money = prospects.map((p) => prospectMoney(p, links));
    return {
      contacts: prospects.length, received: received.length, responded: responded.length, reached: reached.length, clients: clients.length,
      pctResponse: received.length ? responded.length / received.length : 0,
      pctClose: received.length ? clients.length / received.length : 0,
      quoted: money.reduce((a, m) => a + m.quoted, 0), sold: money.reduce((a, m) => a + m.sold, 0),
      pending: prospects.filter((p) => followupOf(p, today)).length,
    };
  }, [prospects, links, today]);

  const groups = useMemo(() => ({
    received: breakdown(prospects, RECEIVED, (p) => p.received),
    kind: breakdown(prospects, KINDS, (p) => (p.kind ? [p.kind] : [])),
    source: breakdown(prospects, SOURCES, (p) => (p.source ? [p.source] : [])),
  }), [prospects]);

  // Contactos por semana (por fecha del 1er envío, o de alta si no tiene) y clientes nuevos (ventas)
  const weeks = useMemo(() => {
    const thisMonday = mondayOf(today);
    return Array.from({ length: WEEKS_SHOWN }, (_, i) => {
      const from = addDaysIso(thisMonday, -7 * (WEEKS_SHOWN - 1 - i)), to = addDaysIso(from, 6);
      const r = { from, to };
      return {
        from,
        contacts: prospects.filter((p) => inRange(p.first_sent_at ?? p.created_at.slice(0, 10), r)).length,
        clients: links.sales.filter((s) => s.status !== "cancelada" && inRange(s.sale_date, r)).length,
      };
    });
  }, [prospects, links.sales, today]);

  // Ingresos contra gastos por mes (gastos = anotados + costo de las ventas)
  const months = useMemo(() => {
    const y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7)) - 1;
    return Array.from({ length: MONTHS_SHOWN }, (_, i) => {
      const idx = y * 12 + m - (MONTHS_SHOWN - 1 - i);
      const yy = Math.floor(idx / 12), mm = (idx % 12) + 1;
      const from = `${yy}-${String(mm).padStart(2, "0")}-01`;
      const to = `${yy}-${String(mm).padStart(2, "0")}-${new Date(Date.UTC(yy, mm, 0)).getUTCDate()}`;
      const r = { from, to: to > today ? today : to };
      const income = links.sales.reduce((a, s) => a + saleIncomeIn(s, r), 0);
      const spent = expenses.filter((e) => inRange(e.spent_on, r)).reduce((a, e) => a + e.amount_usd, 0)
        + links.sales.filter((s) => s.status !== "cancelada" && inRange(s.sale_date, r)).reduce((a, s) => a + s.cost_usd, 0);
      return { label: `${MONTHS[mm - 1]} ${String(yy).slice(2)}`, income, spent };
    });
  }, [links.sales, expenses, today]);

  const tourList = useMemo(() => links.tours.filter((t) => t.published).map((t) => ({ t, v: visits.get(t.id) }))
    .sort((a, b) => (b.v?.visits_recent ?? 0) - (a.v?.visits_recent ?? 0)), [links.tours, visits]);

  if (loading) return <p className="text-gray-500 flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Cargando…</p>;

  const funnel = [
    { label: "Recibieron PDF, link u hoja", n: k.received },
    { label: "Respondieron", n: k.responded },
    { label: "Demo, visita o propuesta", n: k.reached },
    { label: "Clientes", n: k.clients },
  ];
  const maxWeek = Math.max(1, ...weeks.map((w) => w.contacts));
  const maxMonth = Math.max(1, ...months.flatMap((m) => [m.income, m.spent]));
  const maxVisits = Math.max(1, ...tourList.map((x) => x.v?.visits_recent ?? 0));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setReports(true)}><Download size={14} className="mr-1.5" /> Reportes para bajar</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <Kpi label="Contactos" value={String(k.contacts)} />
        <Kpi label="Recibieron PDF o link" value={String(k.received)} />
        <Kpi label="Respondieron" value={String(k.responded)} hint={`${pct(k.pctResponse)} de respuesta`} />
        <Kpi label="Demos / visitas" value={String(k.reached)} />
        <Kpi label="Clientes" value={String(k.clients)} hint={`${pct(k.pctClose)} de cierre`} />
        <Kpi label="Cotizado" value={usd(k.quoted)} />
        <Kpi label="Vendido" value={usd(k.sold)} />
        <Kpi label="Seguimientos pendientes" value={String(k.pending)} alert={k.pending > 0} />
      </div>

      <WeekCard prospects={prospects} events={events} links={links} />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card icon={Filter} title="Embudo" desc="Cuántos pasan de un paso al siguiente.">
          <div className="space-y-2">
            {funnel.map((f, i) => (
              <div key={f.label} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span>{f.label}</span>
                  <span className="font-semibold tabular-nums">{f.n}{i > 0 && funnel[i - 1].n ? <span className="text-gray-400 font-normal"> · {pct(f.n / funnel[i - 1].n)}</span> : null}</span>
                </div>
                <Bar value={f.n} max={funnel[0].n || 1} className={i === funnel.length - 1 ? "bg-green-600" : "bg-[#0F2B4C]"} />
              </div>
            ))}
          </div>
        </Card>

        <Card icon={BarChart3} title="Contactos por semana" desc="Personas nuevas (por la fecha del primer envío) y ventas de cada semana.">
          <div className="space-y-1">
            {weeks.map((w) => (
              <div key={w.from} className="grid grid-cols-[56px_1fr_52px] items-center gap-2 text-xs">
                <span className="text-gray-500">{shortDay(w.from)}</span>
                <Bar value={w.contacts} max={maxWeek} className="bg-[#F0A030]" />
                <span className="text-right tabular-nums"><b>{w.contacts}</b>{w.clients ? <span className="text-green-700"> · {w.clients}✓</span> : null}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">✓ = ventas de esa semana.</p>
        </Card>
      </div>

      <Card icon={Trophy} title="¿Qué funciona mejor?" desc={`Respuesta y cierre por grupo. La estrella marca el de mejor respuesta (con ${MIN_FOR_BEST}+ contactos). "Qué recibió" puede contar a una persona en varios grupos.`}>
        <div className="grid lg:grid-cols-3 gap-3">
          <GroupTable title="Por lo que recibió" rows={groups.received} />
          <GroupTable title="Por tipo de cliente" rows={groups.kind} />
          <GroupTable title="Por cómo llegó" rows={groups.source} />
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card icon={TrendingUp} title="Ingresos contra gastos" desc="Por mes: lo cobrado de las ventas contra lo gastado (gastos anotados y costo de las ventas).">
          <div className="space-y-2">
            {months.map((m) => (
              <div key={m.label} className="grid grid-cols-[48px_1fr_70px] items-center gap-2 text-xs">
                <span className="text-gray-500">{m.label}</span>
                <div className="space-y-0.5"><Bar value={m.income} max={maxMonth} className="bg-green-600" /><Bar value={m.spent} max={maxMonth} className="bg-red-400" /></div>
                <span className={cn("text-right tabular-nums font-semibold", m.income - m.spent >= 0 ? "text-green-700" : "text-red-600")}>{m.income - m.spent < 0 ? "−" : ""}{usd(Math.abs(m.income - m.spent))}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 flex gap-3"><span><span className="inline-block w-2 h-2 rounded-full bg-green-600 mr-1" />Ingresos</span><span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />Gastos</span></p>
        </Card>

        <Card icon={Eye} title="Visitas por tour" desc="Tours publicados, visitas de los últimos 30 días (sin las del equipo).">
          {tourList.length ? (
            <div className="space-y-1.5">
              {tourList.map(({ t, v }) => (
                <div key={t.id} className="grid grid-cols-[1fr_auto] gap-x-2 text-xs">
                  <span className="truncate font-semibold text-[#0F2B4C]">{t.title}</span>
                  <span className="tabular-nums"><b>{v?.visits_recent ?? 0}</b> <span className="text-gray-400">· {v?.visits ?? 0} en total</span></span>
                  <div className="col-span-2"><Bar value={v?.visits_recent ?? 0} max={maxVisits} className="bg-[#F0A030]" /></div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400">No hay tours publicados.</p>}
        </Card>
      </div>

      {reports && <ProspectReports prospects={prospects} links={links} events={events} expenses={expenses} visits={visits} onClose={() => setReports(false)} />}
    </div>
  );
}

function GroupTable({ title, rows }: { title: string; rows: ReturnType<typeof breakdown> }) {
  const shown = rows.filter((r) => r.contacts > 0);
  const best = [...shown].filter((r) => r.contacts >= MIN_FOR_BEST).sort((a, b) => b.pctResponse - a.pctResponse || b.pctClose - a.pctClose)[0];
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <p className="text-xs font-bold text-[#0F2B4C] px-2.5 py-1.5 bg-[#f5f8fc]">{title}</p>
      {shown.length ? (
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase text-gray-400">
            <tr><th className="text-left font-semibold px-2.5 py-1"></th><th className="font-semibold px-1">Cont.</th><th className="font-semibold px-1">Resp.</th><th className="font-semibold px-1">Clien.</th><th className="font-semibold px-2.5 text-right">% resp.</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {shown.map((r) => (
              <tr key={r.key} className={cn(best?.key === r.key && "bg-green-50")}>
                <td className="px-2.5 py-1.5 truncate max-w-[130px]">{best?.key === r.key ? "★ " : ""}{r.label}</td>
                <td className="text-center tabular-nums">{r.contacts}</td>
                <td className="text-center tabular-nums">{r.responded}</td>
                <td className="text-center tabular-nums">{r.clients}</td>
                <td className="px-2.5 text-right tabular-nums font-semibold">{pct(r.pctResponse)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="text-xs text-gray-400 px-2.5 py-2">Sin datos todavía.</p>}
    </div>
  );
}

// ── Metas y plan de la semana ────────────────────────────────────────────────────────────────────
function WeekCard({ prospects, events, links }: { prospects: Prospect[]; events: ProspectEvent[]; links: Linkables }) {
  const [start, setStart] = useState(() => mondayOf(todayDR()));
  const [week, setWeek] = useState<TourWeek | null>(null);
  const [newTask, setNewTask] = useState("");
  const [editGoals, setEditGoals] = useState(false);

  useEffect(() => {
    setWeek(null);
    loadWeek(start).then(setWeek, (e) => fail("Error al cargar la semana", e));
  }, [start]);

  const progress = useMemo(() => weekProgress(start, prospects, events, links), [start, prospects, events, links]);

  async function update(w: TourWeek) {
    setWeek(w);
    try { await saveWeek(w); } catch (e) { fail("No se pudo guardar la semana", e); }
  }
  const setTask = (id: string, patch: Partial<WeekTask>) => week && update({ ...week, tasks: week.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });

  const end = addDaysIso(start, 6);
  const done = week?.tasks.filter((t) => t.done).length ?? 0;
  const goals = week ? [
    { label: "Contactos", n: progress.contacts, goal: week.goal_contacts, key: "goal_contacts" as const },
    { label: "Conversaciones", n: progress.conversations, goal: week.goal_conversations, key: "goal_conversations" as const },
    { label: "Ventas", n: progress.sales, goal: week.goal_sales, key: "goal_sales" as const },
  ] : [];

  return (
    <Card icon={Target} title="Metas y plan de la semana"
      action={
        <div className="flex items-center gap-1 text-xs">
          <button onClick={() => setStart(addDaysIso(start, -7))} className="p-1 rounded hover:bg-gray-100" aria-label="Semana anterior"><ChevronLeft size={16} /></button>
          <span className="font-semibold text-[#0F2B4C] whitespace-nowrap">{shortDay(start)} – {shortDay(end)}</span>
          <button onClick={() => setStart(addDaysIso(start, 7))} className="p-1 rounded hover:bg-gray-100" aria-label="Semana siguiente"><ChevronRight size={16} /></button>
        </div>
      }>
      {!week ? <p className="text-gray-500 text-xs flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Cargando…</p> : (
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4">
          <div className="space-y-2.5">
            {goals.map((g) => (
              <div key={g.key} className="space-y-0.5">
                <div className="flex justify-between items-center text-xs">
                  <span>{g.label}</span>
                  {editGoals ? (
                    <Input type="number" inputMode="numeric" min={0} className="h-7 w-16 text-right" value={g.goal}
                      onChange={(e) => update({ ...week, [g.key]: Math.max(0, Math.round(Number(e.target.value) || 0)) })} aria-label={`Meta de ${g.label}`} />
                  ) : <span className="tabular-nums"><b>{g.n}</b> de {g.goal}</span>}
                </div>
                <Bar value={g.n} max={g.goal || 1} className={g.n >= g.goal && g.goal > 0 ? "bg-green-600" : "bg-[#F0A030]"} />
              </div>
            ))}
            <button className="text-xs text-[#0F2B4C] underline" onClick={() => setEditGoals((v) => !v)}>{editGoals ? "Listo" : "Cambiar metas"}</button>
            <p className="text-[11px] text-gray-400">Contactos = personas a las que les escribiste, llamaste o visitaste esta semana. Conversaciones = las que respondieron.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[#0F2B4C]">Plan: {done} de {week.tasks.length}</span>
              <div className="flex-1"><Bar value={done} max={week.tasks.length || 1} className="bg-green-600" /></div>
            </div>
            <ul className="space-y-1">
              {week.tasks.map((t) => (
                <li key={t.id} className="flex items-start gap-2 text-xs group">
                  <input type="checkbox" checked={t.done} onChange={(e) => setTask(t.id, { done: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#0F2B4C] shrink-0" aria-label={t.text} />
                  <span className={cn("flex-1", t.done && "line-through text-gray-400")}>
                    {t.when && <span className="text-gray-400">{t.when} · </span>}{t.text}
                  </span>
                  <button onClick={() => update({ ...week, tasks: week.tasks.filter((x) => x.id !== t.id) })} className="text-gray-300 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Quitar tarea"><Trash2 size={13} /></button>
                </li>
              ))}
            </ul>
            <form className="flex gap-1.5" onSubmit={(e) => {
              e.preventDefault();
              if (!newTask.trim()) return;
              update({ ...week, tasks: [...week.tasks, { id: crypto.randomUUID(), when: "", text: newTask.trim(), done: false, notes: "" }] });
              setNewTask("");
            }}>
              <Input className="h-9" placeholder="Agregar tarea" value={newTask} onChange={(e) => setNewTask(e.target.value)} />
              <Button type="submit" size="sm" variant="outline"><Plus size={14} /></Button>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
