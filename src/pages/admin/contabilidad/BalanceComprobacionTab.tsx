import { useMemo, useState } from "react";
import { TableProperties, ChevronLeft, ChevronRight, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChartOfAccounts, useJournalEntries, useAllJournalEntryLines } from "@/hooks/useFiscal";

const MONTHS = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(n);
}

const TIPO_COLORS: Record<string, string> = {
  Activo: "text-blue-600",
  Pasivo: "text-red-600",
  Capital: "text-purple-600",
  Ingreso: "text-green-600",
  Costo: "text-orange-600",
  Gasto: "text-amber-600",
};

interface BalanceRow {
  codigo: string;
  nombre: string;
  tipo: string;
  naturaleza: string;
  nivel: number;
  acepta_movimientos: boolean;
  debitos: number;
  creditos: number;
  saldo: number;
}

export function BalanceComprobacionTab({ fiscalPropertyId }: { fiscalPropertyId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: accounts = [] } = useChartOfAccounts();
  const { data: entries = [] } = useJournalEntries();
  const { data: allLines = [] } = useAllJournalEntryLines();

  function prevMonth() { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); }

  const balanceRows = useMemo(() => {
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

    const saldoMap: Record<string, { debitos: number; creditos: number }> = {};
    for (const line of monthLines) {
      if (!saldoMap[line.cuenta_codigo]) saldoMap[line.cuenta_codigo] = { debitos: 0, creditos: 0 };
      saldoMap[line.cuenta_codigo].debitos += line.debito;
      saldoMap[line.cuenta_codigo].creditos += line.credito;
    }

    const rows: BalanceRow[] = [];
    for (const acct of accounts) {
      const mov = saldoMap[acct.codigo];
      if (!mov && acct.acepta_movimientos) continue;

      let childDebitos = 0;
      let childCreditos = 0;
      if (!acct.acepta_movimientos) {
        for (const [code, m] of Object.entries(saldoMap)) {
          if (code.startsWith(acct.codigo) && code !== acct.codigo) {
            childDebitos += m.debitos;
            childCreditos += m.creditos;
          }
        }
        if (childDebitos === 0 && childCreditos === 0) continue;
      }

      const debitos = mov ? mov.debitos : childDebitos;
      const creditos = mov ? mov.creditos : childCreditos;
      const saldo = acct.naturaleza === "Debito" ? debitos - creditos : creditos - debitos;

      rows.push({
        codigo: acct.codigo,
        nombre: acct.nombre,
        tipo: acct.tipo,
        naturaleza: acct.naturaleza,
        nivel: acct.nivel,
        acepta_movimientos: acct.acepta_movimientos,
        debitos,
        creditos,
        saldo,
      });
    }

    return rows;
  }, [accounts, entries, allLines, month, year, fiscalPropertyId]);

  const totalDebitos = balanceRows.filter((r) => r.acepta_movimientos).reduce((s, r) => s + r.debitos, 0);
  const totalCreditos = balanceRows.filter((r) => r.acepta_movimientos).reduce((s, r) => s + r.creditos, 0);
  const isBalanced = Math.abs(totalDebitos - totalCreditos) < 0.01;

  function downloadCSV() {
    const header = "Código,Nombre,Tipo,Débitos,Créditos,Saldo\n";
    const lines = balanceRows
      .map((r) => `"${r.codigo}","${r.nombre}","${r.tipo}",${r.debitos.toFixed(2)},${r.creditos.toFixed(2)},${r.saldo.toFixed(2)}`)
      .join("\n");
    const blob = new Blob([header + lines], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `balance_comprobacion_${year}_${String(month).padStart(2, "0")}.csv`;
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

      {/* Balance status + export */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${isBalanced ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {isBalanced ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {isBalanced ? "Balance cuadrado" : `Descuadre: ${fmtCurrency(Math.abs(totalDebitos - totalCreditos))}`}
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadCSV}>
          <Download size={14} /> Exportar CSV
        </Button>
      </div>

      {/* Balance table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0F2B4C] text-white text-[10px] uppercase">
              <th className="text-left px-4 py-2.5 font-semibold">Código</th>
              <th className="text-left px-4 py-2.5 font-semibold">Cuenta</th>
              <th className="text-center px-4 py-2.5 font-semibold">Tipo</th>
              <th className="text-right px-4 py-2.5 font-semibold">Débitos</th>
              <th className="text-right px-4 py-2.5 font-semibold">Créditos</th>
              <th className="text-right px-4 py-2.5 font-semibold">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {balanceRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  <TableProperties size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No hay movimientos contabilizados en este período</p>
                </td>
              </tr>
            )}
            {balanceRows.map((row) => (
              <tr
                key={row.codigo}
                className={`border-t ${!row.acepta_movimientos ? "bg-gray-50 font-semibold" : "hover:bg-gray-50/50"}`}
              >
                <td className="px-4 py-2">
                  <span className="font-mono text-[#0F2B4C]" style={{ paddingLeft: `${(row.nivel - 1) * 12}px` }}>
                    {row.codigo}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className={!row.acepta_movimientos ? "text-[#0F2B4C]" : ""}>
                    {row.nombre}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-[10px] font-bold ${TIPO_COLORS[row.tipo]}`}>{row.tipo}</span>
                </td>
                <td className="px-4 py-2 text-right font-mono">
                  {row.debitos > 0 ? fmtCurrency(row.debitos) : "—"}
                </td>
                <td className="px-4 py-2 text-right font-mono">
                  {row.creditos > 0 ? fmtCurrency(row.creditos) : "—"}
                </td>
                <td className={`px-4 py-2 text-right font-mono font-semibold ${row.saldo >= 0 ? "text-[#0F2B4C]" : "text-red-600"}`}>
                  {fmtCurrency(row.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
          {balanceRows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 bg-[#0F2B4C]/5 font-bold">
                <td colSpan={3} className="px-4 py-2.5 text-xs uppercase text-[#0F2B4C]">Totales</td>
                <td className="px-4 py-2.5 text-right font-mono text-[#0F2B4C]">{fmtCurrency(totalDebitos)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-[#0F2B4C]">{fmtCurrency(totalCreditos)}</td>
                <td className="px-4 py-2.5 text-right font-mono">
                  {isBalanced ? (
                    <span className="text-green-600">OK</span>
                  ) : (
                    <span className="text-red-600">{fmtCurrency(totalDebitos - totalCreditos)}</span>
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
