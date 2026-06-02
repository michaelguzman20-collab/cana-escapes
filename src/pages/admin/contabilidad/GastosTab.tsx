import { useState, useMemo } from "react";
import {
  Plus, Search, X, Pencil, Trash2,
  ChevronLeft, ChevronRight, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  useFiscalExpenses, useCreateFiscalExpense,
  useUpdateFiscalExpense, useDeleteFiscalExpense,
} from "@/hooks/useFiscal";
import { useProperties } from "@/hooks/useProperties";
import { TIPOS_GASTO, FORMAS_PAGO } from "@/types/fiscal";
import type { FiscalExpense, FiscalExpenseInsert } from "@/types/fiscal";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const MONTHS = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Expense Form Dialog ─────────────────────────────────────────────
function ExpenseFormDialog({
  open, onClose, editing,
}: {
  open: boolean; onClose: () => void; editing: FiscalExpense | null;
}) {
  const { data: properties = [] } = useProperties();
  const create = useCreateFiscalExpense();
  const update = useUpdateFiscalExpense();

  const [propertyId, setPropertyId] = useState(editing?.property_id ?? "");
  const [ncf, setNcf] = useState(editing?.ncf ?? "");
  const [tipoGasto, setTipoGasto] = useState(editing?.tipo_gasto ?? "02");
  const [fechaComprobante, setFechaComprobante] = useState(editing?.fecha_comprobante ?? new Date().toISOString().slice(0, 10));
  const [fechaPago, setFechaPago] = useState(editing?.fecha_pago ?? "");
  const [proveedorRnc, setProveedorRnc] = useState(editing?.proveedor_rnc ?? "");
  const [proveedorTipoId, setProveedorTipoId] = useState(editing?.proveedor_tipo_id ?? 1);
  const [proveedorNombre, setProveedorNombre] = useState(editing?.proveedor_nombre ?? "");
  const [montoServicios, setMontoServicios] = useState(editing?.monto_facturado_servicios ?? 0);
  const [montoBienes, setMontoBienes] = useState(editing?.monto_facturado_bienes ?? 0);
  const [itbisFacturado, setItbisFacturado] = useState(editing?.itbis_facturado ?? 0);
  const [itbisRetenido, setItbisRetenido] = useState(editing?.itbis_retenido ?? 0);
  const [tipoRetencionIsr, setTipoRetencionIsr] = useState(editing?.tipo_retencion_isr ?? "");
  const [isrRetenido, setIsrRetenido] = useState(editing?.isr_retenido ?? 0);
  const [formaPago, setFormaPago] = useState(editing?.forma_pago ?? "02");
  const [notas, setNotas] = useState(editing?.notas ?? "");

  const totalFacturado = montoServicios + montoBienes;

  async function handleSave() {
    if (!ncf.trim() || !proveedorRnc.trim()) {
      toast({ title: "NCF y RNC proveedor son requeridos", variant: "destructive" });
      return;
    }
    const expense: FiscalExpenseInsert = {
      property_id: propertyId || null,
      ncf: ncf.trim(),
      ncf_modificado: null,
      tipo_gasto: tipoGasto,
      fecha_comprobante: fechaComprobante,
      fecha_pago: fechaPago || null,
      proveedor_rnc: proveedorRnc.trim(),
      proveedor_tipo_id: proveedorTipoId,
      proveedor_nombre: proveedorNombre || null,
      monto_facturado_servicios: montoServicios,
      monto_facturado_bienes: montoBienes,
      total_facturado: totalFacturado,
      itbis_facturado: itbisFacturado,
      itbis_retenido: itbisRetenido,
      itbis_sujeto_proporcionalidad: 0,
      itbis_llevado_costo: 0,
      itbis_por_adelantar: 0,
      itbis_percibido_compras: 0,
      tipo_retencion_isr: tipoRetencionIsr || null,
      isr_retenido: isrRetenido,
      isc: 0,
      otros_impuestos: 0,
      propina_legal: 0,
      forma_pago: formaPago,
      currency: "DOP",
      exchange_rate: 1,
      status: "Registrado",
      anulacion_tipo: null,
      notas: notas.trim() || null,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...expense });
        toast({ title: "Gasto actualizado" });
      } else {
        await create.mutateAsync(expense);
        toast({ title: "Gasto registrado" });
      }
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Gasto" : "Nuevo Gasto"}</DialogTitle>
          <DialogDescription>Registro de compra/gasto para el reporte 606</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* NCF + Tipo gasto */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">NCF Proveedor *</label>
              <Input value={ncf} onChange={(e) => setNcf(e.target.value)} placeholder="B0100000042" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de Gasto</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={tipoGasto} onChange={(e) => setTipoGasto(e.target.value)}>
                {TIPOS_GASTO.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Forma de Pago</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                {FORMAS_PAGO.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}
              </select>
            </div>
          </div>

          {/* Supplier */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo ID Proveedor</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={proveedorTipoId} onChange={(e) => setProveedorTipoId(+e.target.value)}>
                <option value={1}>RNC</option>
                <option value={2}>Cédula</option>
                <option value={3}>Pasaporte</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">RNC/Cédula Proveedor *</label>
              <Input value={proveedorRnc} onChange={(e) => setProveedorRnc(e.target.value)} placeholder="000000000" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre Proveedor</label>
              <Input value={proveedorNombre} onChange={(e) => setProveedorNombre(e.target.value)} />
            </div>
          </div>

          {/* Dates + Property */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha Comprobante</label>
              <Input type="date" value={fechaComprobante} onChange={(e) => setFechaComprobante(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha Pago</label>
              <Input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Propiedad</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">General</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Amounts */}
          <div className="border rounded-lg p-3 space-y-3 bg-gray-50/50">
            <p className="text-xs font-semibold text-[#0F2B4C]">Montos Facturados</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Servicios</label>
                <Input type="number" step="0.01" min="0" value={montoServicios || ""} onChange={(e) => setMontoServicios(+e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Bienes</label>
                <Input type="number" step="0.01" min="0" value={montoBienes || ""} onChange={(e) => setMontoBienes(+e.target.value)} />
              </div>
              <div className="bg-white border rounded-md px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-bold">{fmtCurrency(totalFacturado)}</p>
              </div>
            </div>
          </div>

          {/* ITBIS + Retentions */}
          <div className="border rounded-lg p-3 space-y-3 bg-gray-50/50">
            <p className="text-xs font-semibold text-[#0F2B4C]">ITBIS y Retenciones</p>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">ITBIS Facturado</label>
                <Input type="number" step="0.01" min="0" value={itbisFacturado || ""} onChange={(e) => setItbisFacturado(+e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">ITBIS Retenido</label>
                <Input type="number" step="0.01" min="0" value={itbisRetenido || ""} onChange={(e) => setItbisRetenido(+e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo Ret. ISR</label>
                <Input value={tipoRetencionIsr} onChange={(e) => setTipoRetencionIsr(e.target.value)} placeholder="01-08" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">ISR Retenido</label>
                <Input type="number" step="0.01" min="0" value={isrRetenido || ""} onChange={(e) => setIsrRetenido(+e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notas</label>
            <textarea className="w-full border rounded-md px-3 py-2 text-sm bg-white resize-none" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : editing ? "Actualizar" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main ─────────────────────────────────────────────────────────��──
export function GastosTab({ fiscalPropertyId }: { fiscalPropertyId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FiscalExpense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FiscalExpense | null>(null);

  const selectedPropertyId = fiscalPropertyId;
  const { data: expenses = [], isLoading } = useFiscalExpenses();
  const deleteExpense = useDeleteFiscalExpense();

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1);
  }

  const filtered = useMemo(() => {
    let list = expenses.filter((exp) => {
      const d = new Date(exp.fecha_comprobante + "T12:00:00");
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    if (selectedPropertyId) list = list.filter(e => e.property_id === selectedPropertyId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.ncf.toLowerCase().includes(q) ||
        (e.proveedor_nombre ?? "").toLowerCase().includes(q) ||
        e.proveedor_rnc.includes(q)
      );
    }
    return list;
  }, [expenses, month, year, selectedPropertyId, search]);

  const totalMes = filtered.reduce((s, e) => s + e.total_facturado, 0);
  const totalItbis = filtered.reduce((s, e) => s + e.itbis_facturado, 0);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteExpense.mutateAsync(deleteTarget.id);
      toast({ title: "Gasto eliminado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#0F2B4C]">Gastos / Compras (Formato 606)</h2>
          <p className="text-xs text-muted-foreground">Registro de comprobantes de compras y gastos</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={14} className="mr-1" /> Nuevo Gasto
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1 bg-[#0F2B4C]/5 rounded-xl px-4 py-2.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft size={16} /></Button>
        <span className="text-sm font-semibold text-[#0F2B4C] min-w-[130px] text-center">{MONTHS[month]} {year}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight size={16} /></Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-3 shadow-sm">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Comprobantes</p>
          <p className="text-lg font-bold text-[#0F2B4C]">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 shadow-sm">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Total Gastos</p>
          <p className="text-lg font-bold text-red-600">{fmtCurrency(totalMes)}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 shadow-sm">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">ITBIS Pagado</p>
          <p className="text-lg font-bold text-amber-600">{fmtCurrency(totalItbis)}</p>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por NCF, proveedor, RNC…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white" />
        {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}><X size={14} /></button>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-[#2D6A9F] border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">{search ? "Sin resultados." : "No hay gastos registrados en este período."}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((exp) => (
            <div key={exp.id} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-semibold text-[#0F2B4C]">{exp.ncf}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#0F2B4C]/10 text-[#0F2B4C]">
                      {TIPOS_GASTO.find(t => t.code === exp.tipo_gasto)?.name ?? exp.tipo_gasto}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{fmtDate(exp.fecha_comprobante)}</span>
                    {exp.proveedor_nombre && <span>{exp.proveedor_nombre}</span>}
                    <span className="font-mono">{exp.proveedor_rnc}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm text-red-600">{fmtCurrency(exp.total_facturado)}</div>
                  <div className="text-[10px] text-muted-foreground">ITBIS: {fmtCurrency(exp.itbis_facturado)}</div>
                </div>
              </div>
              <div className="flex justify-end gap-1 mt-2 pt-2 border-t">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(exp); setFormOpen(true); }}><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteTarget(exp)}><Trash2 size={13} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && <ExpenseFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} editing={editing} />}

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle size={18} className="text-red-500" /> Eliminar gasto</DialogTitle>
            <DialogDescription>¿Eliminar el gasto con NCF {deleteTarget?.ncf}?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteExpense.isPending}>
              {deleteExpense.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
