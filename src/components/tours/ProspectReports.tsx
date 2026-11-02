import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { quoteNumber } from "@/lib/tourPricing";
import {
  EVENT_KINDS, EXPENSE_CATEGORIES, downloadCsv, inRange, label, prospectRows, saleIncomeIn, saleValue, statusOf, todayDR, tourIncome,
  type Cell, type Expense, type Linkables, type Prospect, type ProspectEvent, type Range, type TourVisits,
} from "@/lib/tourProspects";

// Reportes de Tours 360 para bajar en CSV (abre en Excel): prospectos, bitácora, dinero, visitas por
// tour, o todo lo de un cliente. Con rango de fechas.

type Kind = "prospectos" | "bitacora" | "dinero" | "visitas" | "cliente";

const KINDS: { key: Kind; name: string; hint: string }[] = [
  { key: "prospectos", name: "Prospectos", hint: "Las columnas del Excel, uno por fila (por fecha del 1er envío)" },
  { key: "bitacora", name: "Bitácora", hint: "Cada mensaje, llamada, visita y respuesta" },
  { key: "dinero", name: "Ingresos y gastos", hint: "Cobros, cuotas, gastos y costo de las ventas" },
  { key: "visitas", name: "Visitas por tour", hint: "Visitas contra lo que pagó cada cliente (total, sin fechas)" },
  { key: "cliente", name: "Un cliente", hint: "Todo lo de una persona: datos, bitácora, cotizaciones, ventas, gastos y tours" },
];

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const monthStart = () => todayDR().slice(0, 8) + "01";

export function ProspectReports({ prospects, links, events, expenses, visits, onClose }: {
  prospects: Prospect[]; links: Linkables; events: ProspectEvent[]; expenses: Expense[]; visits: Map<string, TourVisits>; onClose: () => void;
}) {
  const [kind, setKind] = useState<Kind>("prospectos");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [who, setWho] = useState(prospects[0]?.id ?? "");
  const byId = new Map(prospects.map((p) => [p.id, p]));
  const name = (id: string | null) => (id ? byId.get(id)?.name ?? "" : "");
  const range: Range = { from: from || null, to: to || null };
  const usesRange = kind !== "visitas";
  const span = from || to ? `_${from || "inicio"}_a_${to || "hoy"}` : "";

  function moneyRows(r: Range, only?: string): Cell[][] {
    const rows: Cell[][] = [];
    for (const s of links.sales) {
      if (only && s.prospect_id !== only) continue;
      const got = saleIncomeIn(s, { from: r.from, to: r.to ?? todayDR() });
      if (got > 0) rows.push([s.sale_date, "Ingreso", `${s.client_name || "Venta"}${s.pay === "suscripcion" ? " (pago inicial y cuotas del periodo)" : ""}`, name(s.prospect_id), got, ""]);
      if (s.status !== "cancelada" && s.cost_usd > 0 && inRange(s.sale_date, r)) rows.push([s.sale_date, "Costo de la venta", `Tiempo y traslados · ${s.client_name}`, name(s.prospect_id), -s.cost_usd, ""]);
    }
    for (const e of expenses) {
      if (only && e.prospect_id !== only) continue;
      if (!inRange(e.spent_on, r)) continue;
      rows.push([e.spent_on, `Gasto · ${label(EXPENSE_CATEGORIES, e.category)}`, e.description, name(e.prospect_id), -e.amount_usd, e.currency === "rd" ? e.amount : ""]);
    }
    rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const total = rows.reduce((a, x) => a + Number(x[4]), 0);
    return [["Fecha", "Tipo", "Concepto", "Persona", "US$", "RD$ (si fue en pesos)"], ...rows, [], ["", "", "", "Resultado", Math.round(total * 100) / 100, ""]];
  }

  const eventRows = (list: ProspectEvent[]): Cell[][] => [
    ["Fecha", "Persona", "Empresa", "Qué", "Plantilla", "Nota"],
    ...list.filter((e) => inRange(e.happened_on, range)).sort((a, b) => a.happened_on.localeCompare(b.happened_on))
      .map((e) => [e.happened_on, name(e.prospect_id), byId.get(e.prospect_id)?.company ?? "", label(EVENT_KINDS, e.kind), e.template ? `Mensaje ${e.template.slice(1)}` : "", e.note]),
  ];

  function visitRows(only?: string): Cell[][] {
    return [["Tour", "Enlace", "Publicado", "Cliente", "Visitas", "Personas", "Visitas últimos 30 días", "Primera visita", "Última visita", "Pagó US$", "US$ por visita"],
      ...links.tours.filter((t) => !only || t.prospect_id === only).map((t) => {
        const v = visits.get(t.id), income = tourIncome(t.id, links);
        return [t.title, `canaescapes.com/tour/${t.slug}`, t.published ? "Sí" : "No", name(t.prospect_id), v?.visits ?? 0, v?.visitors ?? 0, v?.visits_recent ?? 0,
          v?.first_visit?.slice(0, 10) ?? "", v?.last_visit?.slice(0, 10) ?? "", income ?? "", income && v?.visits ? Math.round((income / v.visits) * 100) / 100 : ""];
      })];
  }

  function download() {
    if (kind === "prospectos") {
      const list = prospects.filter((p) => inRange(p.first_sent_at ?? p.created_at.slice(0, 10), range));
      downloadCsv(`tours360_prospectos${span}`, prospectRows(list, links));
    } else if (kind === "bitacora") {
      downloadCsv(`tours360_bitacora${span}`, eventRows(events));
    } else if (kind === "dinero") {
      downloadCsv(`tours360_ingresos-y-gastos${span}`, moneyRows(range));
    } else if (kind === "visitas") {
      downloadCsv(`tours360_visitas-por-tour_${todayDR()}`, visitRows());
    } else {
      const p = byId.get(who);
      if (!p) return toast({ title: "Elige a la persona", variant: "destructive" });
      const quotes = links.quotes.filter((q) => q.prospect_id === p.id);
      const sales = links.sales.filter((s) => s.prospect_id === p.id);
      const rows: Cell[][] = [
        [`Tours 360 · ${p.name}${p.company ? ` · ${p.company}` : ""}`], [`Reporte del ${todayDR()}${span ? ` · periodo ${from || "inicio"} a ${to || "hoy"}` : ""}`], [],
        ["DATOS"], ...prospectRows([p], links), [],
        ["BITÁCORA"], ...eventRows(events.filter((e) => e.prospect_id === p.id)), [],
        ["COTIZACIONES"], ["Número", "Fecha", "Estado", "Total US$"],
        ...quotes.map((q) => [quoteNumber(q.number, q.created_at), q.created_at.slice(0, 10), q.status, q.total_usd]), [],
        ["VENTAS"], ["Fecha", "Cliente", "Forma de pago", "Inicial US$", "Cuota US$/mes", "Meses", "Valor total US$", "Estado"],
        ...sales.map((s) => [s.sale_date, s.client_name, s.pay === "suscripcion" ? "Suscripción" : "Pago único", s.amount_usd, s.monthly_usd || "", s.pay === "suscripcion" ? s.months : "", saleValue(s), s.status]), [],
        ["INGRESOS Y GASTOS"], ...moneyRows(range, p.id), [],
        ["TOURS Y VISITAS"], ...visitRows(p.id), [],
        ["Estado actual", statusOf(p.status).label],
      ];
      downloadCsv(`tours360_${slug(p.name) || "cliente"}${span}`, rows);
    }
    toast({ title: "Reporte descargado", description: "Ábrelo con Excel." });
  }

  const SHEET = "top-auto bottom-0 translate-y-0 data-[state=open]:slide-in-from-top-[100%] max-h-[92dvh] overflow-y-auto rounded-t-2xl rounded-b-none p-4 sm:p-6 sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:rounded-2xl max-w-lg";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={SHEET}>
        <DialogTitle className="text-lg font-bold text-[#0F2B4C] pr-8">Reportes para bajar</DialogTitle>
        <div className="space-y-3 text-sm">
          <div className="space-y-1.5">
            {KINDS.map((k) => (
              <button key={k.key} type="button" onClick={() => setKind(k.key)}
                className={cn("w-full text-left rounded-lg border px-3 py-2", kind === k.key ? "border-[#F0A030] bg-[#FCEBD0]" : "border-gray-200 bg-white")}>
                <span className="block font-semibold text-[#0F2B4C]">{k.name}</span>
                <span className="block text-[11px] text-gray-500">{k.hint}</span>
              </button>
            ))}
          </div>
          {kind === "cliente" && (
            <select value={who} onChange={(e) => setWho(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-2" aria-label="Persona">
              {prospects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.company ? ` · ${p.company}` : ""}</option>)}
            </select>
          )}
          {usesRange && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1"><span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Desde</span><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
                <label className="space-y-1"><span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Hasta</span><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFrom(monthStart()); setTo(todayDR()); }}>Este mes</Button>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFrom(""); setTo(""); }}>Todo</Button>
              </div>
            </div>
          )}
          <Button className="w-full bg-[#0F2B4C] hover:bg-[#173a63]" onClick={download}><Download size={15} className="mr-1.5" /> Bajar CSV (Excel)</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
