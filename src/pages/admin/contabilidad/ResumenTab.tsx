import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Receipt, ChevronLeft, ChevronRight, Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useFiscalInvoices, useFiscalExpenses, useFiscalRetentions, useSeedFiscalData } from "@/hooks/useFiscal";

const MONTHS = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency", currency: "DOP", minimumFractionDigits: 2,
  }).format(n);
}

export function ResumenTab({ fiscalPropertyId }: { fiscalPropertyId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const selectedPropertyId = fiscalPropertyId;

  const { data: invoices = [] } = useFiscalInvoices();
  const { data: expenses = [] } = useFiscalExpenses();
  const { data: retentions = [] } = useFiscalRetentions();
  const seedData = useSeedFiscalData();

  const hasData = invoices.length > 0 || expenses.length > 0 || retentions.length > 0;

  async function handleSeed() {
    try {
      const result = await seedData.mutateAsync();
      toast({ title: `Datos cargados: ${result.invoices} facturas, ${result.expenses} gastos, ${result.retentions} retenciones` });
    } catch (err: any) {
      toast({ title: "Error cargando datos", description: err.message, variant: "destructive" });
    }
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  }

  const monthInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const d = new Date(inv.fecha + "T12:00:00");
      const matchMonth = d.getMonth() + 1 === month && d.getFullYear() === year;
      const matchProp = !selectedPropertyId || inv.property_id === selectedPropertyId;
      return matchMonth && matchProp && inv.status !== "Anulada";
    });
  }, [invoices, month, year, selectedPropertyId]);

  const monthExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const d = new Date(exp.fecha_comprobante + "T12:00:00");
      const matchMonth = d.getMonth() + 1 === month && d.getFullYear() === year;
      const matchProp = !selectedPropertyId || exp.property_id === selectedPropertyId;
      return matchMonth && matchProp && exp.status !== "Anulado";
    });
  }, [expenses, month, year, selectedPropertyId]);

  const monthRetentions = useMemo(() => {
    return retentions.filter((ret) => {
      const matchMonth = ret.periodo_mes === month && ret.periodo_year === year;
      const matchProp = !selectedPropertyId || ret.property_id === selectedPropertyId;
      return matchMonth && matchProp;
    });
  }, [retentions, month, year, selectedPropertyId]);

  const totalIngresos = monthInvoices.reduce((s, i) => s + i.total_facturado, 0);
  const totalItbisCobrado = monthInvoices.reduce((s, i) => s + i.itbis_facturado, 0);
  const totalGastos = monthExpenses.reduce((s, e) => s + e.total_facturado, 0);
  const totalItbisPagado = monthExpenses.reduce((s, e) => s + e.itbis_facturado, 0);
  const itbisAPagar = Math.max(0, totalItbisCobrado - totalItbisPagado);
  const creditoFiscal = totalItbisPagado > totalItbisCobrado ? totalItbisPagado - totalItbisCobrado : 0;
  const totalRetencionesISR = monthRetentions.filter(r => r.tipo === "ISR").reduce((s, r) => s + r.monto_retenido, 0);
  const totalRetencionesITBIS = monthRetentions.filter(r => r.tipo === "ITBIS").reduce((s, r) => s + r.monto_retenido, 0);
  const utilidadBruta = totalIngresos - totalGastos;

  return (
    <div className="space-y-5">
      {/* Seed data banner */}
      {!hasData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-800">Sin datos fiscales</p>
            <p className="text-xs text-amber-600">Carga datos de ejemplo para Mayo 2026 (6 facturas, 8 gastos, 5 retenciones).</p>
          </div>
          <Button size="sm" onClick={handleSeed} disabled={seedData.isPending} className="gap-1.5 shrink-0">
            {seedData.isPending ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
            {seedData.isPending ? "Cargando..." : "Cargar datos de ejemplo"}
          </Button>
        </div>
      )}

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-1 bg-[#0F2B4C]/5 rounded-xl px-4 py-2.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </Button>
        <span className="text-sm font-semibold text-[#0F2B4C] min-w-[130px] text-center">
          {MONTHS[month]} {year}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Ingresos Brutos"
          value={fmtCurrency(totalIngresos)}
          sub={`${monthInvoices.length} facturas`}
          icon={TrendingUp}
          color="text-green-600"
        />
        <KpiCard
          label="Gastos Totales"
          value={fmtCurrency(totalGastos)}
          sub={`${monthExpenses.length} comprobantes`}
          icon={TrendingDown}
          color="text-red-600"
        />
        <KpiCard
          label="Utilidad Bruta"
          value={fmtCurrency(utilidadBruta)}
          sub={totalIngresos > 0 ? `${((utilidadBruta / totalIngresos) * 100).toFixed(1)}% margen` : "—"}
          icon={DollarSign}
          color={utilidadBruta >= 0 ? "text-blue-600" : "text-red-600"}
        />
        <KpiCard
          label="ITBIS a Pagar"
          value={fmtCurrency(itbisAPagar)}
          sub={creditoFiscal > 0 ? `Crédito: ${fmtCurrency(creditoFiscal)}` : "Sin crédito fiscal"}
          icon={Receipt}
          color="text-amber-600"
        />
      </div>

      {/* ITBIS breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <h3 className="text-xs font-bold text-[#0F2B4C] uppercase tracking-wider mb-3">Desglose ITBIS</h3>
          <div className="space-y-2 text-sm">
            <Row label="ITBIS Cobrado (Ventas)" value={fmtCurrency(totalItbisCobrado)} positive />
            <Row label="ITBIS Pagado (Compras)" value={fmtCurrency(totalItbisPagado)} />
            <div className="border-t pt-2">
              <Row
                label={itbisAPagar > 0 ? "ITBIS a Pagar" : "Crédito Fiscal a Favor"}
                value={fmtCurrency(itbisAPagar > 0 ? itbisAPagar : creditoFiscal)}
                bold
                positive={creditoFiscal > 0}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <h3 className="text-xs font-bold text-[#0F2B4C] uppercase tracking-wider mb-3">Retenciones del Período</h3>
          <div className="space-y-2 text-sm">
            <Row label="Retenciones ISR (IR-17)" value={fmtCurrency(totalRetencionesISR)} />
            <Row label="Retenciones ITBIS" value={fmtCurrency(totalRetencionesITBIS)} />
            <div className="border-t pt-2">
              <Row label="Total Retenido" value={fmtCurrency(totalRetencionesISR + totalRetencionesITBIS)} bold />
            </div>
          </div>
        </div>
      </div>

      {/* Calendar reminders */}
      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <h3 className="text-xs font-bold text-[#0F2B4C] uppercase tracking-wider mb-3">Obligaciones del Mes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <DeadlineCard day="10" label="IR-17 Retenciones a terceros" />
          <DeadlineCard day="15" label="Formatos 606, 607, 608" />
          <DeadlineCard day="20" label="Declaración ITBIS (IT-1)" />
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub: string; icon: any; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function Row({ label, value, bold, positive }: {
  label: string; value: string; bold?: boolean; positive?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={bold ? "font-semibold text-[#0F2B4C]" : "text-muted-foreground"}>{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${positive ? "text-green-600" : "text-[#0F2B4C]"}`}>
        {value}
      </span>
    </div>
  );
}

function DeadlineCard({ day, label }: { day: string; label: string }) {
  const now = new Date();
  const currentDay = now.getDate();
  const isPast = currentDay > parseInt(day);
  return (
    <div className={`rounded-lg border p-3 ${isPast ? "bg-gray-50 opacity-60" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-center gap-2">
        <span className={`text-lg font-bold ${isPast ? "text-gray-400" : "text-amber-600"}`}>
          {day}
        </span>
        <span className={`text-xs ${isPast ? "text-gray-500 line-through" : "text-[#0F2B4C]"}`}>
          {label}
        </span>
      </div>
    </div>
  );
}
