import { useState, useMemo } from "react";
import {
  Plus, Search, X, Pencil, Trash2,
  ChevronLeft, ChevronRight, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  useFiscalInvoices, useCreateFiscalInvoice,
  useUpdateFiscalInvoice, useDeleteFiscalInvoice, useNextNcf,
} from "@/hooks/useFiscal";
import { useProperties } from "@/hooks/useProperties";
import { TIPOS_NCF, TIPOS_INGRESO } from "@/types/fiscal";
import type { FiscalInvoice, FiscalInvoiceInsert } from "@/types/fiscal";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const MONTHS = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency", currency: "DOP", minimumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-DO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Invoice Form Dialog ─────────────────────────────────────────────
function InvoiceFormDialog({
  open, onClose, editing,
}: {
  open: boolean; onClose: () => void; editing: FiscalInvoice | null;
}) {
  const { data: properties = [] } = useProperties();
  const create = useCreateFiscalInvoice();
  const update = useUpdateFiscalInvoice();
  const nextNcf = useNextNcf();

  const [propertyId, setPropertyId] = useState(editing?.property_id ?? "");
  const [tipoNcf, setTipoNcf] = useState(editing?.tipo_ncf ?? "E32");
  const [ncf, setNcf] = useState(editing?.ncf ?? "");
  const [tipoIngreso, setTipoIngreso] = useState(editing?.tipo_ingreso ?? "01");
  const [fecha, setFecha] = useState(editing?.fecha ?? new Date().toISOString().slice(0, 10));
  const [clienteRnc, setClienteRnc] = useState(editing?.cliente_rnc ?? "");
  const [clienteTipoId, setClienteTipoId] = useState(editing?.cliente_tipo_id ?? 2);
  const [clienteNombre, setClienteNombre] = useState(editing?.cliente_nombre ?? "");
  const [montoGravado18, setMontoGravado18] = useState(editing?.monto_gravado_18 ?? 0);
  const [montoGravado16, setMontoGravado16] = useState(editing?.monto_gravado_16 ?? 0);
  const [montoExento, setMontoExento] = useState(editing?.monto_exento ?? 0);
  const [montoEfectivo, setMontoEfectivo] = useState(editing?.monto_efectivo ?? 0);
  const [montoTransferencia, setMontoTransferencia] = useState(editing?.monto_cheque_transferencia ?? 0);
  const [montoTarjeta, setMontoTarjeta] = useState(editing?.monto_tarjeta ?? 0);
  const [montoCredito, setMontoCredito] = useState(editing?.monto_credito ?? 0);
  const [notas, setNotas] = useState(editing?.notas ?? "");

  const itbis18 = +(montoGravado18 * 0.18).toFixed(2);
  const itbis16 = +(montoGravado16 * 0.16).toFixed(2);
  const itbisTotal = itbis18 + itbis16;
  const totalFacturado = montoGravado18 + montoGravado16 + montoExento + itbisTotal;

  async function generateNcf() {
    try {
      const newNcf = await nextNcf.mutateAsync(tipoNcf);
      setNcf(newNcf);
      toast({ title: `NCF generado: ${newNcf}` });
    } catch (err: any) {
      toast({ title: "Error generando NCF", description: err.message, variant: "destructive" });
    }
  }

  async function handleSave() {
    if (!ncf.trim()) {
      toast({ title: "NCF es requerido", variant: "destructive" });
      return;
    }
    const invoice: FiscalInvoiceInsert = {
      property_id: propertyId || null,
      ncf: ncf.trim(),
      ncf_modificado: null,
      tipo_ncf: tipoNcf,
      tipo_ingreso: tipoIngreso,
      fecha,
      cliente_rnc: clienteRnc || null,
      cliente_tipo_id: clienteTipoId,
      cliente_nombre: clienteNombre || null,
      monto_gravado_18: montoGravado18,
      monto_gravado_16: montoGravado16,
      monto_exento: montoExento,
      itbis_facturado: itbisTotal,
      itbis_percibido: 0,
      isc: 0,
      otros_impuestos: 0,
      propina_legal: 0,
      monto_efectivo: montoEfectivo,
      monto_cheque_transferencia: montoTransferencia,
      monto_tarjeta: montoTarjeta,
      monto_credito: montoCredito,
      monto_bonos: 0,
      monto_permuta: 0,
      monto_otras_formas: 0,
      retencion_itbis_terceros: 0,
      retencion_isr_terceros: 0,
      total_facturado: totalFacturado,
      currency: "DOP",
      exchange_rate: 1,
      status: "Activa",
      anulacion_tipo: null,
      notas: notas.trim() || null,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...invoice });
        toast({ title: "Ingreso actualizado" });
      } else {
        await create.mutateAsync(invoice);
        toast({ title: "Ingreso registrado" });
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
          <DialogTitle>{editing ? "Editar Ingreso" : "Nuevo Ingreso"}</DialogTitle>
          <DialogDescription>
            Registro de factura/ingreso para el reporte 607
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* NCF row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo NCF</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={tipoNcf} onChange={(e) => setTipoNcf(e.target.value)}>
                {TIPOS_NCF.filter(t => ["E31","E32","E33","E34"].includes(t.code)).map(t => (
                  <option key={t.code} value={t.code}>{t.code} - {t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">NCF / e-CF *</label>
              <div className="flex gap-1">
                <Input value={ncf} onChange={(e) => setNcf(e.target.value)} placeholder="E3200000001" className="flex-1" />
                {!editing && (
                  <Button type="button" variant="outline" size="sm" onClick={generateNcf} disabled={nextNcf.isPending} className="text-xs shrink-0">
                    Auto
                  </Button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo Ingreso</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={tipoIngreso} onChange={(e) => setTipoIngreso(e.target.value)}>
                {TIPOS_INGRESO.map(t => (
                  <option key={t.code} value={t.code}>{t.code} - {t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Property + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Propiedad</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">General (sin propiedad)</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha</label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          {/* Client */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo ID Cliente</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={clienteTipoId} onChange={(e) => setClienteTipoId(+e.target.value)}>
                <option value={1}>RNC</option>
                <option value={2}>Cédula</option>
                <option value={3}>Pasaporte</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">RNC/Cédula Cliente</label>
              <Input value={clienteRnc} onChange={(e) => setClienteRnc(e.target.value)} placeholder="000000000" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre Cliente</label>
              <Input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
            </div>
          </div>

          {/* Amounts */}
          <div className="border rounded-lg p-3 space-y-3 bg-gray-50/50">
            <p className="text-xs font-semibold text-[#0F2B4C]">Montos</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Gravado 18%</label>
                <Input type="number" step="0.01" min="0" value={montoGravado18 || ""} onChange={(e) => setMontoGravado18(+e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Gravado 16%</label>
                <Input type="number" step="0.01" min="0" value={montoGravado16 || ""} onChange={(e) => setMontoGravado16(+e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Exento</label>
                <Input type="number" step="0.01" min="0" value={montoExento || ""} onChange={(e) => setMontoExento(+e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border rounded-md px-3 py-2">
                <p className="text-[10px] text-muted-foreground">ITBIS 18%</p>
                <p className="text-sm font-semibold">{fmtCurrency(itbis18)}</p>
              </div>
              <div className="bg-white border rounded-md px-3 py-2">
                <p className="text-[10px] text-muted-foreground">ITBIS 16%</p>
                <p className="text-sm font-semibold">{fmtCurrency(itbis16)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                <p className="text-[10px] text-blue-600 font-medium">Total Facturado</p>
                <p className="text-sm font-bold text-blue-700">{fmtCurrency(totalFacturado)}</p>
              </div>
            </div>
          </div>

          {/* Payment methods */}
          <div className="border rounded-lg p-3 space-y-3 bg-gray-50/50">
            <p className="text-xs font-semibold text-[#0F2B4C]">Forma de Pago (desglose para 607)</p>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Efectivo</label>
                <Input type="number" step="0.01" min="0" value={montoEfectivo || ""} onChange={(e) => setMontoEfectivo(+e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Transferencia</label>
                <Input type="number" step="0.01" min="0" value={montoTransferencia || ""} onChange={(e) => setMontoTransferencia(+e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tarjeta</label>
                <Input type="number" step="0.01" min="0" value={montoTarjeta || ""} onChange={(e) => setMontoTarjeta(+e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Crédito</label>
                <Input type="number" step="0.01" min="0" value={montoCredito || ""} onChange={(e) => setMontoCredito(+e.target.value)} />
              </div>
            </div>
          </div>

          {/* Notes */}
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

// ── Main ────────────────────────────────────────────────────────────
export function IngresosTab({ fiscalPropertyId }: { fiscalPropertyId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FiscalInvoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FiscalInvoice | null>(null);

  const selectedPropertyId = fiscalPropertyId;
  const { data: invoices = [], isLoading } = useFiscalInvoices();
  const deleteInvoice = useDeleteFiscalInvoice();

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1);
  }

  const filtered = useMemo(() => {
    let list = invoices.filter((inv) => {
      const d = new Date(inv.fecha + "T12:00:00");
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    if (selectedPropertyId) {
      list = list.filter(i => i.property_id === selectedPropertyId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.ncf.toLowerCase().includes(q) ||
        (i.cliente_nombre ?? "").toLowerCase().includes(q) ||
        (i.cliente_rnc ?? "").includes(q)
      );
    }
    return list;
  }, [invoices, month, year, selectedPropertyId, search]);

  const totalMes = filtered.reduce((s, i) => s + i.total_facturado, 0);
  const totalItbis = filtered.reduce((s, i) => s + i.itbis_facturado, 0);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteInvoice.mutateAsync(deleteTarget.id);
      toast({ title: "Ingreso eliminado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#0F2B4C]">Ingresos / Ventas (Formato 607)</h2>
          <p className="text-xs text-muted-foreground">Registro de facturas emitidas</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={14} className="mr-1" /> Nuevo Ingreso
        </Button>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-center gap-1 bg-[#0F2B4C]/5 rounded-xl px-4 py-2.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft size={16} /></Button>
        <span className="text-sm font-semibold text-[#0F2B4C] min-w-[130px] text-center">{MONTHS[month]} {year}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight size={16} /></Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-3 shadow-sm">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Facturas</p>
          <p className="text-lg font-bold text-[#0F2B4C]">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 shadow-sm">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Total Facturado</p>
          <p className="text-lg font-bold text-green-600">{fmtCurrency(totalMes)}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 shadow-sm">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">ITBIS Cobrado</p>
          <p className="text-lg font-bold text-amber-600">{fmtCurrency(totalItbis)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por NCF, cliente, RNC…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white" />
        {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}><X size={14} /></button>}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-[#2D6A9F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {search ? "Sin resultados." : "No hay ingresos registrados en este período."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-semibold text-[#0F2B4C]">{inv.ncf}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {TIPOS_NCF.find(t => t.code === inv.tipo_ncf)?.name ?? inv.tipo_ncf}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      inv.status === "Activa" ? "bg-green-100 text-green-700" :
                      inv.status === "Anulada" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>{inv.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{fmtDate(inv.fecha)}</span>
                    {inv.cliente_nombre && <span>{inv.cliente_nombre}</span>}
                    {inv.cliente_rnc && <span className="font-mono">{inv.cliente_rnc}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm text-green-600">{fmtCurrency(inv.total_facturado)}</div>
                  <div className="text-[10px] text-muted-foreground">ITBIS: {fmtCurrency(inv.itbis_facturado)}</div>
                </div>
              </div>
              <div className="flex justify-end gap-1 mt-2 pt-2 border-t">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(inv); setFormOpen(true); }}>
                  <Pencil size={13} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => setDeleteTarget(inv)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {formOpen && (
        <InvoiceFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          editing={editing}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" /> Eliminar ingreso
            </DialogTitle>
            <DialogDescription>
              ¿Eliminar la factura {deleteTarget?.ncf}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteInvoice.isPending}>
              {deleteInvoice.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
