import { useState, useMemo } from "react";
import { Download, FileSpreadsheet, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, FileText, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useFiscalInvoices, useFiscalExpenses, useFiscalRetentions, useFiscalConfig } from "@/hooks/useFiscal";
import { useProperties } from "@/hooks/useProperties";
import type { FiscalInvoice, FiscalExpense } from "@/types/fiscal";
import { TIPOS_NCF, TIPOS_GASTO, FORMAS_PAGO, TIPOS_INGRESO } from "@/types/fiscal";

const MONTHS = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function padRnc(rnc: string, tipoId: number): string {
  const clean = rnc.replace(/[-\s]/g, "");
  if (tipoId === 1) return clean.padStart(9, "0");
  if (tipoId === 2) return clean.padStart(11, "0");
  return clean;
}

function fmtDateDGII(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function fmtAmount(n: number): string {
  return n.toFixed(2);
}

// ── Generate 606 file content (Gastos) ──────────────────────────────
function generate606(expenses: FiscalExpense[], rnc: string, periodo: string): string {
  const header = `606|${rnc.replace(/-/g, "")}|${periodo}|${expenses.length}`;
  const lines = expenses.map((e) => {
    return [
      padRnc(e.proveedor_rnc, e.proveedor_tipo_id),
      e.proveedor_tipo_id,
      e.tipo_gasto,
      e.ncf,
      e.ncf_modificado ?? "",
      fmtDateDGII(e.fecha_comprobante),
      e.fecha_pago ? fmtDateDGII(e.fecha_pago) : "",
      fmtAmount(e.monto_facturado_servicios),
      fmtAmount(e.monto_facturado_bienes),
      fmtAmount(e.total_facturado),
      fmtAmount(e.itbis_facturado),
      fmtAmount(e.itbis_retenido),
      fmtAmount(e.itbis_sujeto_proporcionalidad),
      fmtAmount(e.itbis_llevado_costo),
      fmtAmount(e.itbis_por_adelantar),
      fmtAmount(e.itbis_percibido_compras),
      e.tipo_retencion_isr ?? "",
      fmtAmount(e.isr_retenido),
      fmtAmount(e.isc),
      fmtAmount(e.otros_impuestos),
      fmtAmount(e.propina_legal),
      e.forma_pago,
    ].join("|");
  });
  return [header, ...lines].join("\n");
}

// ── Generate 607 file content (Ingresos) ────────────────────────────
function generate607(invoices: FiscalInvoice[], rnc: string, periodo: string): string {
  const header = `607|${rnc.replace(/-/g, "")}|${periodo}|${invoices.length}`;
  const lines = invoices.map((inv) => {
    return [
      inv.cliente_rnc ? padRnc(inv.cliente_rnc, inv.cliente_tipo_id) : "",
      inv.cliente_rnc ? inv.cliente_tipo_id : "",
      inv.ncf,
      inv.ncf_modificado ?? "",
      inv.tipo_ingreso,
      fmtDateDGII(inv.fecha),
      fmtAmount(inv.itbis_facturado),
      fmtAmount(inv.itbis_percibido),
      fmtAmount(inv.retencion_itbis_terceros),
      fmtAmount(inv.retencion_isr_terceros),
      fmtAmount(inv.isc),
      fmtAmount(inv.otros_impuestos),
      fmtAmount(inv.propina_legal),
      fmtAmount(inv.monto_efectivo),
      fmtAmount(inv.monto_cheque_transferencia),
      fmtAmount(inv.monto_tarjeta),
      fmtAmount(inv.monto_credito),
      fmtAmount(inv.monto_bonos),
      fmtAmount(inv.monto_permuta),
      fmtAmount(inv.monto_otras_formas),
    ].join("|");
  });
  return [header, ...lines].join("\n");
}

// ── Generate 608 file content (Anulados) ────────────────────────────
function generate608(invoices: FiscalInvoice[], expenses: FiscalExpense[], rnc: string, periodo: string): string {
  const anulados: { ncf: string; tipo: string; fecha: string }[] = [];
  invoices.filter(i => i.status === "Anulada").forEach(i => {
    anulados.push({ ncf: i.ncf, tipo: i.anulacion_tipo ?? "05", fecha: fmtDateDGII(i.fecha) });
  });
  expenses.filter(e => e.status === "Anulado").forEach(e => {
    anulados.push({ ncf: e.ncf, tipo: e.anulacion_tipo ?? "05", fecha: fmtDateDGII(e.fecha_comprobante) });
  });

  const header = `608|${rnc.replace(/-/g, "")}|${periodo}|${anulados.length}`;
  const lines = anulados.map(a => [a.ncf, a.fecha, a.tipo].join("|"));
  return [header, ...lines].join("\n");
}

function downloadFile(content: string, filename: string, mimeType = "text/plain;charset=utf-8;") {
  const blob = new Blob(["﻿" + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(val: string | number | null | undefined): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function lookupName(list: readonly { readonly code: string; readonly name: string }[], code: string) {
  return list.find(x => x.code === code)?.name ?? code;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(n);
}

export function ReportesTab({ fiscalPropertyId }: { fiscalPropertyId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const selectedPropertyId = fiscalPropertyId;

  const { data: invoices = [] } = useFiscalInvoices();
  const { data: expenses = [] } = useFiscalExpenses();
  const { data: retentions = [] } = useFiscalRetentions();
  const { data: config } = useFiscalConfig();
  const { data: properties = [] } = useProperties();

  function prevMonth() { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); }

  const periodo = `${year}${String(month).padStart(2, "0")}`;
  const rnc = config?.rnc ?? "133703823";

  const monthInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const d = new Date(inv.fecha + "T12:00:00");
      const match = d.getMonth() + 1 === month && d.getFullYear() === year;
      return match && (!selectedPropertyId || inv.property_id === selectedPropertyId);
    });
  }, [invoices, month, year, selectedPropertyId]);

  const monthExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const d = new Date(exp.fecha_comprobante + "T12:00:00");
      const match = d.getMonth() + 1 === month && d.getFullYear() === year;
      return match && (!selectedPropertyId || exp.property_id === selectedPropertyId);
    });
  }, [expenses, month, year, selectedPropertyId]);

  const activeInvoices = monthInvoices.filter(i => i.status !== "Anulada");
  const activeExpenses = monthExpenses.filter(e => e.status !== "Anulado");
  const anuladosCount = monthInvoices.filter(i => i.status === "Anulada").length +
    monthExpenses.filter(e => e.status === "Anulado").length;

  function download606() {
    const content = generate606(activeExpenses, rnc, periodo);
    downloadFile(content, `606_${periodo}.txt`);
    toast({ title: `Formato 606 descargado — ${activeExpenses.length} registros` });
  }

  function download607() {
    const content = generate607(activeInvoices, rnc, periodo);
    downloadFile(content, `607_${periodo}.txt`);
    toast({ title: `Formato 607 descargado — ${activeInvoices.length} registros` });
  }

  function download608() {
    const content = generate608(monthInvoices, monthExpenses, rnc, periodo);
    downloadFile(content, `608_${periodo}.txt`);
    toast({ title: `Formato 608 descargado — ${anuladosCount} registros` });
  }

  function downloadAll() {
    download606();
    download607();
    download608();
  }

  const monthRetentions = useMemo(() => {
    return retentions.filter(r => {
      const matchMonth = r.periodo_mes === month && r.periodo_year === year;
      return matchMonth && (!selectedPropertyId || r.property_id === selectedPropertyId);
    });
  }, [retentions, month, year, selectedPropertyId]);

  function propName(pid: string | null) {
    if (!pid) return "General";
    return properties.find(p => p.id === pid)?.name ?? "—";
  }

  function downloadIngresosCSV() {
    const headers = [
      "NCF","Tipo NCF","Descripción NCF","Tipo Ingreso","Descripción Ingreso","Fecha",
      "Propiedad","Cliente RNC/Cédula","Tipo ID","Cliente Nombre",
      "Gravado 18%","Gravado 16%","Exento","ITBIS Facturado",
      "Efectivo","Cheque/Transferencia","Tarjeta","Crédito","Bonos","Permuta","Otras Formas",
      "Total Facturado","Moneda","Status","Notas"
    ];
    const rows = monthInvoices.map(inv => [
      inv.ncf, inv.tipo_ncf, lookupName(TIPOS_NCF, inv.tipo_ncf),
      inv.tipo_ingreso, lookupName(TIPOS_INGRESO, inv.tipo_ingreso),
      inv.fecha, propName(inv.property_id),
      inv.cliente_rnc ?? "", inv.cliente_tipo_id, inv.cliente_nombre ?? "",
      fmtAmount(inv.monto_gravado_18), fmtAmount(inv.monto_gravado_16), fmtAmount(inv.monto_exento),
      fmtAmount(inv.itbis_facturado),
      fmtAmount(inv.monto_efectivo), fmtAmount(inv.monto_cheque_transferencia),
      fmtAmount(inv.monto_tarjeta), fmtAmount(inv.monto_credito),
      fmtAmount(inv.monto_bonos), fmtAmount(inv.monto_permuta), fmtAmount(inv.monto_otras_formas),
      fmtAmount(inv.total_facturado), inv.currency, inv.status, inv.notas ?? "",
    ].map(csvEscape).join(","));
    downloadFile([headers.join(","), ...rows].join("\n"), `Ingresos_Detallado_${periodo}.csv`, "text/csv;charset=utf-8;");
    toast({ title: `Ingresos CSV descargado — ${monthInvoices.length} registros` });
  }

  function downloadGastosCSV() {
    const headers = [
      "NCF","Tipo Gasto","Descripción Gasto","Fecha Comprobante","Fecha Pago",
      "Propiedad","Proveedor RNC","Tipo ID","Proveedor Nombre",
      "Monto Servicios","Monto Bienes","Total Facturado",
      "ITBIS Facturado","ITBIS Retenido","ISR Retenido","Tipo Ret. ISR",
      "Forma Pago","Descripción Forma Pago","Moneda","Status","Notas"
    ];
    const rows = monthExpenses.map(exp => [
      exp.ncf, exp.tipo_gasto, lookupName(TIPOS_GASTO, exp.tipo_gasto),
      exp.fecha_comprobante, exp.fecha_pago ?? "",
      propName(exp.property_id), exp.proveedor_rnc, exp.proveedor_tipo_id, exp.proveedor_nombre ?? "",
      fmtAmount(exp.monto_facturado_servicios), fmtAmount(exp.monto_facturado_bienes), fmtAmount(exp.total_facturado),
      fmtAmount(exp.itbis_facturado), fmtAmount(exp.itbis_retenido), fmtAmount(exp.isr_retenido),
      exp.tipo_retencion_isr ?? "",
      exp.forma_pago, lookupName(FORMAS_PAGO, exp.forma_pago),
      exp.currency, exp.status, exp.notas ?? "",
    ].map(csvEscape).join(","));
    downloadFile([headers.join(","), ...rows].join("\n"), `Gastos_Detallado_${periodo}.csv`, "text/csv;charset=utf-8;");
    toast({ title: `Gastos CSV descargado — ${monthExpenses.length} registros` });
  }

  function downloadRetencionesCSV() {
    const headers = [
      "Tipo","Concepto","Fecha","Propiedad",
      "Beneficiario RNC","Tipo ID","Beneficiario Nombre",
      "Monto Base","Tasa (%)","Monto Retenido",
      "NCF Relacionado","Período","Status","Notas"
    ];
    const rows = monthRetentions.map(r => [
      r.tipo, r.concepto, r.fecha, propName(r.property_id),
      r.beneficiario_rnc, r.beneficiario_tipo_id, r.beneficiario_nombre ?? "",
      fmtAmount(r.monto_base), r.tasa_retencion, fmtAmount(r.monto_retenido),
      r.ncf_relacionado ?? "", `${r.periodo_mes}/${r.periodo_year}`,
      r.status, r.notas ?? "",
    ].map(csvEscape).join(","));
    downloadFile([headers.join(","), ...rows].join("\n"), `Retenciones_Detallado_${periodo}.csv`, "text/csv;charset=utf-8;");
    toast({ title: `Retenciones CSV descargado — ${monthRetentions.length} registros` });
  }

  function downloadResumenFinanciero() {
    const totalIngresos = activeInvoices.reduce((s, i) => s + i.total_facturado, 0);
    const totalItbisCobrado = activeInvoices.reduce((s, i) => s + i.itbis_facturado, 0);
    const totalGastos = activeExpenses.reduce((s, e) => s + e.total_facturado, 0);
    const totalItbisPagado = activeExpenses.reduce((s, e) => s + e.itbis_facturado, 0);
    const utilidad = totalIngresos - totalGastos;
    const itbisAPagar = Math.max(0, totalItbisCobrado - totalItbisPagado);
    const creditoFiscal = totalItbisPagado > totalItbisCobrado ? totalItbisPagado - totalItbisCobrado : 0;
    const totalISR = monthRetentions.filter(r => r.tipo === "ISR").reduce((s, r) => s + r.monto_retenido, 0);
    const totalITBIS = monthRetentions.filter(r => r.tipo === "ITBIS").reduce((s, r) => s + r.monto_retenido, 0);

    const lines = [
      `RESUMEN FINANCIERO — ${MONTHS[month]} ${year}`,
      `Empresa: ${config?.razon_social ?? "CanaEscapes"}`,
      `RNC: ${rnc}`,
      `Período: ${periodo}`,
      `Generado: ${new Date().toLocaleString("es-DO")}`,
      `Vista: ${selectedPropertyId ? propName(selectedPropertyId) : "Todas las propiedades"}`,
      "",
      "═══════════════════════════════════════════════",
      "INGRESOS (607)",
      `  Facturas activas:          ${activeInvoices.length}`,
      `  Total Facturado:           ${fmtCurrency(totalIngresos)}`,
      `  ITBIS Cobrado:             ${fmtCurrency(totalItbisCobrado)}`,
      "",
      "  Desglose por tipo NCF:",
      ...TIPOS_NCF.filter(t => ["E31","E32","E33","E34"].includes(t.code)).map(t => {
        const sub = activeInvoices.filter(i => i.tipo_ncf === t.code);
        return sub.length > 0 ? `    ${t.code} ${t.name}: ${sub.length} — ${fmtCurrency(sub.reduce((s,i) => s + i.total_facturado, 0))}` : null;
      }).filter(Boolean) as string[],
      "",
      "  Formas de pago:",
      `    Efectivo:                ${fmtCurrency(activeInvoices.reduce((s, i) => s + i.monto_efectivo, 0))}`,
      `    Cheque/Transferencia:    ${fmtCurrency(activeInvoices.reduce((s, i) => s + i.monto_cheque_transferencia, 0))}`,
      `    Tarjeta:                 ${fmtCurrency(activeInvoices.reduce((s, i) => s + i.monto_tarjeta, 0))}`,
      `    Crédito:                 ${fmtCurrency(activeInvoices.reduce((s, i) => s + i.monto_credito, 0))}`,
      "",
      "═══════════════════════════════════════════════",
      "GASTOS (606)",
      `  Comprobantes activos:      ${activeExpenses.length}`,
      `  Total Gastos:              ${fmtCurrency(totalGastos)}`,
      `  ITBIS Pagado:              ${fmtCurrency(totalItbisPagado)}`,
      "",
      "  Desglose por tipo de gasto:",
      ...TIPOS_GASTO.map(t => {
        const sub = activeExpenses.filter(e => e.tipo_gasto === t.code);
        return sub.length > 0 ? `    ${t.code} ${t.name}: ${sub.length} — ${fmtCurrency(sub.reduce((s,e) => s + e.total_facturado, 0))}` : null;
      }).filter(Boolean) as string[],
      "",
      "═══════════════════════════════════════════════",
      "RETENCIONES (IR-17)",
      `  Total retenciones:         ${monthRetentions.length}`,
      `  ISR Retenido:              ${fmtCurrency(totalISR)}`,
      `  ITBIS Retenido:            ${fmtCurrency(totalITBIS)}`,
      `  Total Retenido:            ${fmtCurrency(totalISR + totalITBIS)}`,
      "",
      "═══════════════════════════════════════════════",
      "RESULTADO DEL PERÍODO",
      `  Ingresos Brutos:           ${fmtCurrency(totalIngresos)}`,
      `  Gastos Totales:            ${fmtCurrency(totalGastos)}`,
      `  Utilidad Bruta:            ${fmtCurrency(utilidad)}`,
      `  Margen:                    ${totalIngresos > 0 ? ((utilidad / totalIngresos) * 100).toFixed(1) + "%" : "N/A"}`,
      "",
      `  ITBIS a Pagar DGII:       ${fmtCurrency(itbisAPagar)}`,
      ...(creditoFiscal > 0 ? [`  Crédito Fiscal a Favor:    ${fmtCurrency(creditoFiscal)}`] : []),
      `  Retenciones a Declarar:    ${fmtCurrency(totalISR + totalITBIS)}`,
      "",
      "═══════════════════════════════════════════════",
      "COMPROBANTES ANULADOS (608)",
      `  Total anulados:            ${anuladosCount}`,
      "",
      ...(properties.length > 1 ? [
        "═══════════════════════════════════════════════",
        "DESGLOSE POR PROPIEDAD",
        ...properties.map(p => {
          const pInv = activeInvoices.filter(i => i.property_id === p.id);
          const pExp = activeExpenses.filter(e => e.property_id === p.id);
          const pIngresos = pInv.reduce((s, i) => s + i.total_facturado, 0);
          const pGastos = pExp.reduce((s, e) => s + e.total_facturado, 0);
          return [
            `  ${p.name}:`,
            `    Ingresos: ${fmtCurrency(pIngresos)} (${pInv.length} facturas)`,
            `    Gastos:   ${fmtCurrency(pGastos)} (${pExp.length} comprobantes)`,
            `    Utilidad: ${fmtCurrency(pIngresos - pGastos)}`,
          ].join("\n");
        }),
        (() => {
          const genInv = activeInvoices.filter(i => !i.property_id);
          const genExp = activeExpenses.filter(e => !e.property_id);
          if (genInv.length === 0 && genExp.length === 0) return "";
          const gI = genInv.reduce((s, i) => s + i.total_facturado, 0);
          const gE = genExp.reduce((s, e) => s + e.total_facturado, 0);
          return `  General (sin propiedad):\n    Ingresos: ${fmtCurrency(gI)} (${genInv.length})\n    Gastos:   ${fmtCurrency(gE)} (${genExp.length})`;
        })(),
      ] : []),
    ].filter(l => l !== "");

    downloadFile(lines.join("\n"), `Resumen_Financiero_${periodo}.txt`);
    toast({ title: "Resumen financiero detallado descargado" });
  }

  function downloadAllDetailed() {
    downloadIngresosCSV();
    downloadGastosCSV();
    downloadRetencionesCSV();
    downloadResumenFinanciero();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-bold text-[#0F2B4C]">Reportes DGII</h2>
        <p className="text-xs text-muted-foreground">
          Genera los archivos de texto (.txt) con formato pipe (|) para carga en la Oficina Virtual DGII.
          Plazo: día 15 de cada mes (previo a declaración IT-1 del día 20).
        </p>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-1 bg-[#0F2B4C]/5 rounded-xl px-4 py-2.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft size={16} /></Button>
        <span className="text-sm font-semibold text-[#0F2B4C] min-w-[130px] text-center">{MONTHS[month]} {year}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight size={16} /></Button>
      </div>

      {/* Report Cards — DGII formats */}
      <div className="grid gap-4">
        <ReportCard
          code="606"
          title="Compras de Bienes y Servicios"
          description="Detalle de todas las compras del mes con NCF, montos, ITBIS y retenciones"
          count={activeExpenses.length}
          onDownload={download606}
          hasData={activeExpenses.length > 0}
        />
        <ReportCard
          code="607"
          title="Ventas de Bienes y Servicios"
          description="Detalle de todas las ventas/ingresos del mes con NCF, montos por forma de pago"
          count={activeInvoices.length}
          onDownload={download607}
          hasData={activeInvoices.length > 0}
        />
        <ReportCard
          code="608"
          title="Comprobantes Anulados"
          description="Listado de NCF/e-CF anulados en el mes con motivo de anulación"
          count={anuladosCount}
          onDownload={download608}
          hasData={true}
        />
      </div>

      {/* Download all DGII */}
      <div className="flex justify-center pt-2">
        <Button onClick={downloadAll} className="gap-2">
          <Download size={16} />
          Descargar formatos DGII ({periodo})
        </Button>
      </div>

      {/* ── Exportación Detallada ───────────────────────────────────── */}
      <div className="border-t pt-5">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-[#0F2B4C] flex items-center gap-2">
            <Table2 size={16} />
            Exportación Detallada
          </h2>
          <p className="text-xs text-muted-foreground">
            Archivos CSV con encabezados descriptivos, nombres de propiedades y resumen financiero completo.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={downloadIngresosCSV}
            disabled={monthInvoices.length === 0}
            className="bg-white rounded-xl border shadow-sm p-3 hover:border-green-300 hover:bg-green-50/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet size={14} className="text-green-600" />
              <span className="text-xs font-bold text-[#0F2B4C]">Ingresos CSV</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{monthInvoices.length} registros</p>
            <p className="text-[10px] text-muted-foreground">Con propiedad, cliente, desglose</p>
          </button>
          <button
            onClick={downloadGastosCSV}
            disabled={monthExpenses.length === 0}
            className="bg-white rounded-xl border shadow-sm p-3 hover:border-red-300 hover:bg-red-50/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet size={14} className="text-red-600" />
              <span className="text-xs font-bold text-[#0F2B4C]">Gastos CSV</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{monthExpenses.length} registros</p>
            <p className="text-[10px] text-muted-foreground">Con proveedor, ITBIS, retenciones</p>
          </button>
          <button
            onClick={downloadRetencionesCSV}
            disabled={monthRetentions.length === 0}
            className="bg-white rounded-xl border shadow-sm p-3 hover:border-amber-300 hover:bg-amber-50/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet size={14} className="text-amber-600" />
              <span className="text-xs font-bold text-[#0F2B4C]">Retenciones CSV</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{monthRetentions.length} registros</p>
            <p className="text-[10px] text-muted-foreground">ISR + ITBIS, beneficiarios</p>
          </button>
          <button
            onClick={downloadResumenFinanciero}
            className="bg-white rounded-xl border shadow-sm p-3 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left"
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-blue-600" />
              <span className="text-xs font-bold text-[#0F2B4C]">Resumen .TXT</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Estado financiero</p>
            <p className="text-[10px] text-muted-foreground">KPIs, utilidad, desglose</p>
          </button>
        </div>

        <div className="flex justify-center pt-3">
          <Button variant="outline" onClick={downloadAllDetailed} className="gap-2">
            <Download size={14} />
            Descargar todo detallado ({periodo})
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <h3 className="text-xs font-bold text-blue-800 mb-2">Instrucciones para la Oficina Virtual DGII</h3>
        <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
          <li>Descargue los archivos .txt generados arriba</li>
          <li>Valide con la Herramienta de Pre-validación DGII (opcional pero recomendado)</li>
          <li>Comprima cada archivo en formato .ZIP</li>
          <li>Acceda a la Oficina Virtual: dgii.gov.do/ofv</li>
          <li>Navegue a Formatos de Envíos → Enviar Archivos Pre-Validados</li>
          <li>Seleccione el tipo de formato (606, 607 o 608) y cargue el .ZIP</li>
          <li>Luego de cargar los 3 formatos, proceda con la declaración IT-1 (día 20)</li>
        </ol>
      </div>

      {/* Fiscal info */}
      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <h3 className="text-xs font-bold text-[#0F2B4C] uppercase tracking-wider mb-2">Datos del Emisor</h3>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">RNC</p>
            <p className="font-mono font-semibold">{rnc}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Período</p>
            <p className="font-semibold">{MONTHS[month]} {year} ({periodo})</p>
          </div>
          <div>
            <p className="text-muted-foreground">Razón Social</p>
            <p className="font-semibold">{config?.razon_social ?? "CanaEscapes"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ code, title, description, count, onDownload, hasData }: {
  code: string; title: string; description: string; count: number; onDownload: () => void; hasData: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#0F2B4C]/5 shrink-0">
            <FileSpreadsheet size={20} className="text-[#0F2B4C]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#0F2B4C]">{code}</span>
              <span className="text-sm font-semibold text-[#0F2B4C]">{title}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            <div className="flex items-center gap-2 mt-2">
              {count > 0 ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 size={12} /> {count} registros
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle size={12} /> Sin registros
                </span>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onDownload} disabled={!hasData && code !== "608"}>
          <Download size={13} className="mr-1" /> .TXT
        </Button>
      </div>
    </div>
  );
}
