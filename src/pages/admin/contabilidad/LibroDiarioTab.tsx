import { useMemo, useState } from "react";
import { BookText, Plus, ChevronLeft, ChevronRight, Eye, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  useJournalEntries, useJournalEntryLines, useCreateJournalEntry,
  useUpdateJournalEntryStatus, useChartOfAccounts,
} from "@/hooks/useFiscal";
import type { JournalEntry } from "@/types/fiscal";

const MONTHS = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(n);
}

const STATUS_COLORS: Record<string, string> = {
  Borrador: "bg-gray-100 text-gray-600",
  Contabilizado: "bg-green-100 text-green-700",
  Anulado: "bg-red-100 text-red-700",
};

const TIPO_COLORS: Record<string, string> = {
  Manual: "bg-blue-100 text-blue-700",
  "Auto-Ingreso": "bg-green-100 text-green-700",
  "Auto-Gasto": "bg-orange-100 text-orange-700",
  "Auto-Retencion": "bg-purple-100 text-purple-700",
  Ajuste: "bg-amber-100 text-amber-700",
};

export function LibroDiarioTab({ fiscalPropertyId }: { fiscalPropertyId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: entries = [] } = useJournalEntries();
  const { data: expandedLines = [] } = useJournalEntryLines(expandedId);
  const { data: accounts = [] } = useChartOfAccounts();
  const createEntry = useCreateJournalEntry();
  const updateStatus = useUpdateJournalEntryStatus();

  const movableAccounts = useMemo(() => accounts.filter((a) => a.acepta_movimientos && a.activa), [accounts]);

  const monthEntries = useMemo(() => {
    return entries.filter((e) => {
      const d = new Date(e.fecha + "T12:00:00");
      const matchMonth = d.getMonth() + 1 === month && d.getFullYear() === year;
      const matchProp = !fiscalPropertyId || e.property_id === fiscalPropertyId;
      return matchMonth && matchProp;
    });
  }, [entries, month, year, fiscalPropertyId]);

  const totalDebitos = monthEntries.reduce((s, e) => s + e.total_debito, 0);
  const totalCreditos = monthEntries.reduce((s, e) => s + e.total_credito, 0);
  const contabilizados = monthEntries.filter((e) => e.status === "Contabilizado").length;

  function prevMonth() { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); }

  // Manual entry form
  const [newEntry, setNewEntry] = useState({ fecha: "", descripcion: "", referencia: "" });
  const [newLines, setNewLines] = useState<{ cuenta_codigo: string; descripcion: string; debito: number; credito: number }[]>([
    { cuenta_codigo: "", descripcion: "", debito: 0, credito: 0 },
    { cuenta_codigo: "", descripcion: "", debito: 0, credito: 0 },
  ]);

  function addLine() {
    setNewLines([...newLines, { cuenta_codigo: "", descripcion: "", debito: 0, credito: 0 }]);
  }

  function updateLine(idx: number, field: string, value: any) {
    const next = [...newLines];
    (next[idx] as any)[field] = value;
    setNewLines(next);
  }

  function removeLine(idx: number) {
    if (newLines.length <= 2) return;
    setNewLines(newLines.filter((_, i) => i !== idx));
  }

  async function handleCreate() {
    if (!newEntry.fecha || !newEntry.descripcion) {
      toast({ title: "Fecha y descripción son requeridos", variant: "destructive" });
      return;
    }
    const validLines = newLines.filter((l) => l.cuenta_codigo && (l.debito > 0 || l.credito > 0));
    if (validLines.length < 2) {
      toast({ title: "Mínimo 2 líneas con movimiento", variant: "destructive" });
      return;
    }
    const totalD = validLines.reduce((s, l) => s + l.debito, 0);
    const totalC = validLines.reduce((s, l) => s + l.credito, 0);
    if (Math.abs(totalD - totalC) > 0.01) {
      toast({ title: `Partida no cuadra: Débitos ${fmtCurrency(totalD)} ≠ Créditos ${fmtCurrency(totalC)}`, variant: "destructive" });
      return;
    }
    try {
      await createEntry.mutateAsync({
        entry: {
          fecha: newEntry.fecha,
          descripcion: newEntry.descripcion,
          referencia: newEntry.referencia || null,
          tipo: "Manual",
          property_id: fiscalPropertyId || null,
          source_invoice_id: null,
          source_expense_id: null,
          source_retention_id: null,
          status: "Borrador",
          total_debito: totalD,
          total_credito: totalC,
        },
        lines: validLines,
      });
      toast({ title: "Asiento creado" });
      setShowAdd(false);
      setNewEntry({ fecha: "", descripcion: "", referencia: "" });
      setNewLines([
        { cuenta_codigo: "", descripcion: "", debito: 0, credito: 0 },
        { cuenta_codigo: "", descripcion: "", debito: 0, credito: 0 },
      ]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleStatusChange(entry: JournalEntry, newStatus: string) {
    try {
      await updateStatus.mutateAsync({ id: entry.id, status: newStatus });
      toast({ title: `Asiento #${entry.numero} → ${newStatus}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-center gap-1 bg-[#0F2B4C]/5 rounded-xl px-4 py-2.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft size={16} /></Button>
        <span className="text-sm font-semibold text-[#0F2B4C] min-w-[130px] text-center">{MONTHS[month]} {year}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight size={16} /></Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-[#0F2B4C]">{monthEntries.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Asientos</p>
        </div>
        <div className="bg-white rounded-xl border p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{contabilizados}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Contabilizados</p>
        </div>
        <div className="bg-white rounded-xl border p-3 shadow-sm text-center">
          <p className="text-lg font-bold text-blue-600">{fmtCurrency(totalDebitos)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Total Débitos</p>
        </div>
        <div className="bg-white rounded-xl border p-3 shadow-sm text-center">
          <p className="text-lg font-bold text-red-600">{fmtCurrency(totalCreditos)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Total Créditos</p>
        </div>
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={14} /> Nuevo Asiento Manual
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-[#0F2B4C] uppercase">Nuevo Asiento de Diario</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Fecha *</label>
              <input type="date" className="w-full px-2 py-1.5 text-sm border rounded-lg" value={newEntry.fecha} onChange={(e) => setNewEntry({ ...newEntry, fecha: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Descripción *</label>
              <input className="w-full px-2 py-1.5 text-sm border rounded-lg" value={newEntry.descripcion} onChange={(e) => setNewEntry({ ...newEntry, descripcion: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Referencia</label>
              <input className="w-full px-2 py-1.5 text-sm border rounded-lg" placeholder="NCF o documento" value={newEntry.referencia} onChange={(e) => setNewEntry({ ...newEntry, referencia: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_100px_100px_40px] gap-2 text-[10px] font-semibold text-muted-foreground uppercase">
              <span>Cuenta</span><span>Descripción</span><span>Débito</span><span>Crédito</span><span></span>
            </div>
            {newLines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_100px_100px_40px] gap-2">
                <select className="px-2 py-1.5 text-sm border rounded-lg" value={line.cuenta_codigo} onChange={(e) => updateLine(idx, "cuenta_codigo", e.target.value)}>
                  <option value="">Seleccionar cuenta</option>
                  {movableAccounts.map((a) => (
                    <option key={a.codigo} value={a.codigo}>{a.codigo} - {a.nombre}</option>
                  ))}
                </select>
                <input className="px-2 py-1.5 text-sm border rounded-lg" placeholder="Detalle" value={line.descripcion} onChange={(e) => updateLine(idx, "descripcion", e.target.value)} />
                <input type="number" className="px-2 py-1.5 text-sm border rounded-lg text-right" min={0} step={0.01} value={line.debito || ""} onChange={(e) => updateLine(idx, "debito", +e.target.value)} />
                <input type="number" className="px-2 py-1.5 text-sm border rounded-lg text-right" min={0} step={0.01} value={line.credito || ""} onChange={(e) => updateLine(idx, "credito", +e.target.value)} />
                <button className="text-red-400 hover:text-red-600 p-1" onClick={() => removeLine(idx)}><X size={14} /></button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addLine} className="gap-1"><Plus size={12} /> Línea</Button>
          </div>

          {/* Balance indicator */}
          {(() => {
            const d = newLines.reduce((s, l) => s + (l.debito || 0), 0);
            const c = newLines.reduce((s, l) => s + (l.credito || 0), 0);
            const balanced = Math.abs(d - c) < 0.01;
            return (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${balanced ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {balanced ? <Check size={14} /> : <AlertCircle size={14} />}
                Débitos: {fmtCurrency(d)} | Créditos: {fmtCurrency(c)} — {balanced ? "Cuadra" : `Diferencia: ${fmtCurrency(Math.abs(d - c))}`}
              </div>
            );
          })()}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={createEntry.isPending} className="gap-1">
              <Check size={14} /> Guardar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Entries list */}
      <div className="space-y-2">
        {monthEntries.length === 0 && (
          <div className="bg-white rounded-xl border p-8 shadow-sm text-center text-muted-foreground">
            <BookText size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay asientos en este período</p>
          </div>
        )}
        {monthEntries.map((entry) => (
          <div key={entry.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-[#0F2B4C] bg-[#0F2B4C]/5 px-2 py-0.5 rounded">
                  #{entry.numero}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIPO_COLORS[entry.tipo] || "bg-gray-100"}`}>
                  {entry.tipo}
                </span>
                <span className="text-xs text-muted-foreground">{entry.fecha}</span>
                <span className="text-sm font-medium text-[#0F2B4C] truncate max-w-[300px]">{entry.descripcion}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#0F2B4C]">{fmtCurrency(entry.total_debito)}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[entry.status]}`}>
                  {entry.status}
                </span>
                <Eye size={14} className="text-muted-foreground" />
              </div>
            </button>

            {expandedId === entry.id && (
              <div className="border-t px-4 py-3 bg-gray-50/50">
                {entry.referencia && (
                  <p className="text-xs text-muted-foreground mb-2">Ref: <span className="font-mono">{entry.referencia}</span></p>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase text-muted-foreground">
                      <th className="text-left py-1 font-semibold">Cuenta</th>
                      <th className="text-left py-1 font-semibold">Descripción</th>
                      <th className="text-right py-1 font-semibold">Débito</th>
                      <th className="text-right py-1 font-semibold">Crédito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expandedLines.map((line) => {
                      const acct = accounts.find((a) => a.codigo === line.cuenta_codigo);
                      return (
                        <tr key={line.id} className="border-t">
                          <td className="py-1.5">
                            <span className="font-mono text-xs text-[#0F2B4C]">{line.cuenta_codigo}</span>
                            {acct && <span className="text-xs text-muted-foreground ml-1.5">{acct.nombre}</span>}
                          </td>
                          <td className="py-1.5 text-xs text-muted-foreground">{line.descripcion}</td>
                          <td className="py-1.5 text-right font-medium">
                            {line.debito > 0 ? fmtCurrency(line.debito) : ""}
                          </td>
                          <td className="py-1.5 text-right font-medium">
                            {line.credito > 0 ? fmtCurrency(line.credito) : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td colSpan={2} className="py-1.5 text-xs uppercase">Totales</td>
                      <td className="py-1.5 text-right">{fmtCurrency(expandedLines.reduce((s, l) => s + l.debito, 0))}</td>
                      <td className="py-1.5 text-right">{fmtCurrency(expandedLines.reduce((s, l) => s + l.credito, 0))}</td>
                    </tr>
                  </tfoot>
                </table>

                {entry.status === "Borrador" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="gap-1" onClick={() => handleStatusChange(entry, "Contabilizado")}>
                      <Check size={12} /> Contabilizar
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleStatusChange(entry, "Anulado")}>
                      Anular
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
