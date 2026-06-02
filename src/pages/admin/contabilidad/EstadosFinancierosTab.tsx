import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChartOfAccounts, useJournalEntries, useAllJournalEntryLines } from "@/hooks/useFiscal";

const MONTHS = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(n);
}

type SubView = "resultados" | "situacion";

export function EstadosFinancierosTab({ fiscalPropertyId }: { fiscalPropertyId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [subView, setSubView] = useState<SubView>("resultados");

  const { data: accounts = [] } = useChartOfAccounts();
  const { data: entries = [] } = useJournalEntries();
  const { data: allLines = [] } = useAllJournalEntryLines();

  function prevMonth() { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); }

  const saldoMap = useMemo(() => {
    const monthEntryIds = new Set(
      entries
        .filter((e) => {
          const d = new Date(e.fecha + "T12:00:00");
          const matchMonth = d.getMonth() + 1 === month && d.getFullYear() === year;
          const matchProp = !fiscalPropertyId || e.property_id === fiscalPropertyId;
          return matchMonth && matchProp && e.status === "Contabilizado";
        })
        .map((e) => e.id)
    );

    const monthLines = allLines.filter((l) => monthEntryIds.has(l.entry_id));
    const map: Record<string, { debitos: number; creditos: number }> = {};
    for (const line of monthLines) {
      if (!map[line.cuenta_codigo]) map[line.cuenta_codigo] = { debitos: 0, creditos: 0 };
      map[line.cuenta_codigo].debitos += line.debito;
      map[line.cuenta_codigo].creditos += line.credito;
    }
    return map;
  }, [entries, allLines, month, year, fiscalPropertyId]);

  function getAccountBalance(codigo: string): number {
    const acct = accounts.find((a) => a.codigo === codigo);
    if (!acct) return 0;
    const mov = saldoMap[codigo];
    if (mov) {
      return acct.naturaleza === "Debito" ? mov.debitos - mov.creditos : mov.creditos - mov.debitos;
    }
    let total = 0;
    for (const [code, m] of Object.entries(saldoMap)) {
      if (code.startsWith(codigo) && code !== codigo) {
        const childAcct = accounts.find((a) => a.codigo === code);
        if (childAcct) {
          total += childAcct.naturaleza === "Debito" ? m.debitos - m.creditos : m.creditos - m.debitos;
        }
      }
    }
    return total;
  }

  function getGroupAccounts(prefix: string) {
    return accounts
      .filter((a) => a.codigo.startsWith(prefix) && a.acepta_movimientos && saldoMap[a.codigo])
      .map((a) => ({
        codigo: a.codigo,
        nombre: a.nombre,
        saldo: a.naturaleza === "Debito"
          ? saldoMap[a.codigo].debitos - saldoMap[a.codigo].creditos
          : saldoMap[a.codigo].creditos - saldoMap[a.codigo].debitos,
      }))
      .filter((a) => Math.abs(a.saldo) > 0.01);
  }

  // Estado de Resultados
  const ingresos = getAccountBalance("4");
  const costos = getAccountBalance("5");
  const gastos = getAccountBalance("6");
  const utilidadBruta = ingresos - costos;
  const utilidadNeta = utilidadBruta - gastos;

  // Estado de Situación
  const activos = getAccountBalance("1");
  const pasivos = getAccountBalance("2");
  const capital = getAccountBalance("3");

  function downloadReport() {
    const period = `${MONTHS[month]} ${year}`;
    let content = "";

    if (subView === "resultados") {
      content = `CANA ESCAPES - ESTADO DE RESULTADOS\nPeríodo: ${period}\nRNC: 133-70382-3\n${"=".repeat(60)}\n\n`;
      content += `INGRESOS\n`;
      for (const a of getGroupAccounts("4")) content += `  ${a.codigo} ${a.nombre.padEnd(40)} ${fmtCurrency(a.saldo)}\n`;
      content += `${"─".repeat(60)}\nTotal Ingresos:${" ".repeat(28)}${fmtCurrency(ingresos)}\n\n`;
      content += `COSTOS DE OPERACIÓN\n`;
      for (const a of getGroupAccounts("5")) content += `  ${a.codigo} ${a.nombre.padEnd(40)} ${fmtCurrency(a.saldo)}\n`;
      content += `${"─".repeat(60)}\nTotal Costos:${" ".repeat(30)}${fmtCurrency(costos)}\n\n`;
      content += `UTILIDAD BRUTA:${" ".repeat(28)}${fmtCurrency(utilidadBruta)}\n\n`;
      content += `GASTOS OPERATIVOS\n`;
      for (const a of getGroupAccounts("6")) content += `  ${a.codigo} ${a.nombre.padEnd(40)} ${fmtCurrency(a.saldo)}\n`;
      content += `${"─".repeat(60)}\nTotal Gastos:${" ".repeat(30)}${fmtCurrency(gastos)}\n\n`;
      content += `${"=".repeat(60)}\nUTILIDAD NETA:${" ".repeat(29)}${fmtCurrency(utilidadNeta)}\n`;
    } else {
      content = `CANA ESCAPES - ESTADO DE SITUACIÓN FINANCIERA\nAl: ${period}\nRNC: 133-70382-3\n${"=".repeat(60)}\n\n`;
      content += `ACTIVOS\n`;
      for (const a of getGroupAccounts("1")) content += `  ${a.codigo} ${a.nombre.padEnd(40)} ${fmtCurrency(a.saldo)}\n`;
      content += `${"─".repeat(60)}\nTotal Activos:${" ".repeat(29)}${fmtCurrency(activos)}\n\n`;
      content += `PASIVOS\n`;
      for (const a of getGroupAccounts("2")) content += `  ${a.codigo} ${a.nombre.padEnd(40)} ${fmtCurrency(a.saldo)}\n`;
      content += `${"─".repeat(60)}\nTotal Pasivos:${" ".repeat(29)}${fmtCurrency(pasivos)}\n\n`;
      content += `CAPITAL\n`;
      for (const a of getGroupAccounts("3")) content += `  ${a.codigo} ${a.nombre.padEnd(40)} ${fmtCurrency(a.saldo)}\n`;
      content += `  Resultado del Ejercicio${" ".repeat(19)}${fmtCurrency(utilidadNeta)}\n`;
      content += `${"─".repeat(60)}\nTotal Capital:${" ".repeat(29)}${fmtCurrency(capital + utilidadNeta)}\n\n`;
      content += `${"=".repeat(60)}\nTotal Pasivos + Capital:${" ".repeat(19)}${fmtCurrency(pasivos + capital + utilidadNeta)}\n`;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${subView === "resultados" ? "estado_resultados" : "estado_situacion"}_${year}_${String(month).padStart(2, "0")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-center gap-1 bg-[#0F2B4C]/5 rounded-xl px-4 py-2.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft size={16} /></Button>
        <span className="text-sm font-semibold text-[#0F2B4C] min-w-[130px] text-center">{MONTHS[month]} {year}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight size={16} /></Button>
      </div>

      {/* Sub-tab toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white/70 rounded-lg p-1 border">
          <button
            onClick={() => setSubView("resultados")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              subView === "resultados" ? "bg-[#0F2B4C] text-white shadow-sm" : "text-[#0F2B4C]/70 hover:bg-[#0F2B4C]/5"
            )}
          >
            Estado de Resultados
          </button>
          <button
            onClick={() => setSubView("situacion")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              subView === "situacion" ? "bg-[#0F2B4C] text-white shadow-sm" : "text-[#0F2B4C]/70 hover:bg-[#0F2B4C]/5"
            )}
          >
            Estado de Situación
          </button>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadReport}>
          <Download size={14} /> Exportar
        </Button>
      </div>

      {subView === "resultados" ? (
        <IncomeStatement
          ingresos={ingresos}
          costos={costos}
          gastos={gastos}
          utilidadBruta={utilidadBruta}
          utilidadNeta={utilidadNeta}
          ingresosDetail={getGroupAccounts("4")}
          costosDetail={getGroupAccounts("5")}
          gastosDetail={getGroupAccounts("6")}
          period={`${MONTHS[month]} ${year}`}
        />
      ) : (
        <BalanceSheet
          activos={activos}
          pasivos={pasivos}
          capital={capital}
          utilidadNeta={utilidadNeta}
          activosDetail={getGroupAccounts("1")}
          pasivosDetail={getGroupAccounts("2")}
          capitalDetail={getGroupAccounts("3")}
          period={`${MONTHS[month]} ${year}`}
        />
      )}
    </div>
  );
}

function SectionRow({ items, label, total, icon: Icon, color }: {
  items: { codigo: string; nombre: string; saldo: number }[];
  label: string;
  total: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-3 border-b bg-gray-50`}>
        <Icon size={16} className={color} />
        <h3 className="text-sm font-bold text-[#0F2B4C]">{label}</h3>
      </div>
      <div className="divide-y">
        {items.length === 0 && (
          <div className="px-4 py-3 text-xs text-muted-foreground text-center">Sin movimientos</div>
        )}
        {items.map((item) => (
          <div key={item.codigo} className="flex items-center justify-between px-4 py-2.5">
            <div>
              <span className="text-xs font-mono text-muted-foreground mr-2">{item.codigo}</span>
              <span className="text-sm">{item.nombre}</span>
            </div>
            <span className="text-sm font-semibold font-mono">{fmtCurrency(item.saldo)}</span>
          </div>
        ))}
      </div>
      <div className={`flex items-center justify-between px-4 py-2.5 border-t-2 bg-gray-50`}>
        <span className="text-xs font-bold uppercase text-[#0F2B4C]">Total {label}</span>
        <span className={`text-base font-bold font-mono ${color}`}>{fmtCurrency(total)}</span>
      </div>
    </div>
  );
}

function IncomeStatement({ ingresos, costos, gastos, utilidadBruta, utilidadNeta, ingresosDetail, costosDetail, gastosDetail, period }: {
  ingresos: number; costos: number; gastos: number; utilidadBruta: number; utilidadNeta: number;
  ingresosDetail: any[]; costosDetail: any[]; gastosDetail: any[]; period: string;
}) {
  const margen = ingresos > 0 ? (utilidadNeta / ingresos * 100).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border p-4 shadow-sm text-center">
        <h2 className="text-lg font-bold text-[#0F2B4C]">Estado de Resultados</h2>
        <p className="text-xs text-muted-foreground">Cana Escapes | RNC: 133-70382-3 | Período: {period}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-3 shadow-sm text-center">
          <p className="text-lg font-bold text-green-600">{fmtCurrency(ingresos)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Ingresos</p>
        </div>
        <div className="bg-white rounded-xl border p-3 shadow-sm text-center">
          <p className="text-lg font-bold text-orange-600">{fmtCurrency(costos)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Costos</p>
        </div>
        <div className="bg-white rounded-xl border p-3 shadow-sm text-center">
          <p className="text-lg font-bold text-amber-600">{fmtCurrency(gastos)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Gastos Oper.</p>
        </div>
        <div className="bg-white rounded-xl border p-3 shadow-sm text-center">
          <p className={`text-lg font-bold ${utilidadNeta >= 0 ? "text-blue-600" : "text-red-600"}`}>{fmtCurrency(utilidadNeta)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Utilidad Neta ({margen}%)</p>
        </div>
      </div>

      <SectionRow items={ingresosDetail} label="Ingresos" total={ingresos} icon={TrendingUp} color="text-green-600" />
      <SectionRow items={costosDetail} label="Costos de Operación" total={costos} icon={TrendingDown} color="text-orange-600" />

      {/* Utilidad Bruta */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 shadow-sm flex items-center justify-between">
        <span className="text-sm font-bold text-blue-800">Utilidad Bruta</span>
        <span className={`text-lg font-bold ${utilidadBruta >= 0 ? "text-blue-600" : "text-red-600"}`}>{fmtCurrency(utilidadBruta)}</span>
      </div>

      <SectionRow items={gastosDetail} label="Gastos Operativos" total={gastos} icon={DollarSign} color="text-amber-600" />

      {/* Utilidad Neta */}
      <div className={`rounded-xl border-2 p-4 shadow-sm flex items-center justify-between ${utilidadNeta >= 0 ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
        <span className="text-base font-bold text-[#0F2B4C]">UTILIDAD NETA DEL PERÍODO</span>
        <span className={`text-xl font-bold ${utilidadNeta >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtCurrency(utilidadNeta)}</span>
      </div>
    </div>
  );
}

function BalanceSheet({ activos, pasivos, capital, utilidadNeta, activosDetail, pasivosDetail, capitalDetail, period }: {
  activos: number; pasivos: number; capital: number; utilidadNeta: number;
  activosDetail: any[]; pasivosDetail: any[]; capitalDetail: any[]; period: string;
}) {
  const totalPasivoCapital = pasivos + capital + utilidadNeta;
  const isBalanced = Math.abs(activos - totalPasivoCapital) < 0.01;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border p-4 shadow-sm text-center">
        <h2 className="text-lg font-bold text-[#0F2B4C]">Estado de Situación Financiera</h2>
        <p className="text-xs text-muted-foreground">Cana Escapes | RNC: 133-70382-3 | Al: {period}</p>
      </div>

      {/* Equation */}
      <div className={`rounded-xl border p-4 shadow-sm flex items-center justify-center gap-4 text-center ${isBalanced ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
        <div>
          <p className="text-lg font-bold text-blue-600">{fmtCurrency(activos)}</p>
          <p className="text-[10px] uppercase text-muted-foreground">Activos</p>
        </div>
        <span className="text-xl font-bold text-[#0F2B4C]">=</span>
        <div>
          <p className="text-lg font-bold text-red-600">{fmtCurrency(pasivos)}</p>
          <p className="text-[10px] uppercase text-muted-foreground">Pasivos</p>
        </div>
        <span className="text-xl font-bold text-[#0F2B4C]">+</span>
        <div>
          <p className="text-lg font-bold text-purple-600">{fmtCurrency(capital + utilidadNeta)}</p>
          <p className="text-[10px] uppercase text-muted-foreground">Capital</p>
        </div>
      </div>

      <SectionRow items={activosDetail} label="Activos" total={activos} icon={TrendingUp} color="text-blue-600" />
      <SectionRow items={pasivosDetail} label="Pasivos" total={pasivos} icon={TrendingDown} color="text-red-600" />

      {/* Capital with net income */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
          <DollarSign size={16} className="text-purple-600" />
          <h3 className="text-sm font-bold text-[#0F2B4C]">Capital</h3>
        </div>
        <div className="divide-y">
          {capitalDetail.map((item) => (
            <div key={item.codigo} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <span className="text-xs font-mono text-muted-foreground mr-2">{item.codigo}</span>
                <span className="text-sm">{item.nombre}</span>
              </div>
              <span className="text-sm font-semibold font-mono">{fmtCurrency(item.saldo)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50/50">
            <div>
              <span className="text-xs font-mono text-muted-foreground mr-2">—</span>
              <span className="text-sm font-medium">Resultado del Ejercicio</span>
            </div>
            <span className={`text-sm font-bold font-mono ${utilidadNeta >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmtCurrency(utilidadNeta)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t-2 bg-gray-50">
          <span className="text-xs font-bold uppercase text-[#0F2B4C]">Total Capital</span>
          <span className="text-base font-bold font-mono text-purple-600">{fmtCurrency(capital + utilidadNeta)}</span>
        </div>
      </div>

      {/* Total check */}
      <div className={`rounded-xl border-2 p-4 shadow-sm ${isBalanced ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-[#0F2B4C]">TOTAL PASIVO + CAPITAL</span>
          <span className="text-xl font-bold text-[#0F2B4C]">{fmtCurrency(totalPasivoCapital)}</span>
        </div>
        {!isBalanced && (
          <p className="text-xs text-red-600 mt-1">
            Diferencia con activos: {fmtCurrency(Math.abs(activos - totalPasivoCapital))}
          </p>
        )}
      </div>
    </div>
  );
}
