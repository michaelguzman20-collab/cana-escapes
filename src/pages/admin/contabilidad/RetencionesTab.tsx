import { useState, useMemo } from "react";
import {
  Plus, Search, X, Pencil, Trash2,
  ChevronLeft, ChevronRight, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  useFiscalRetentions, useCreateFiscalRetention,
  useUpdateFiscalRetention, useDeleteFiscalRetention,
} from "@/hooks/useFiscal";
import { useProperties } from "@/hooks/useProperties";
import { CONCEPTOS_RETENCION } from "@/types/fiscal";
import type { FiscalRetention, FiscalRetentionInsert } from "@/types/fiscal";
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

// ── Form Dialog ─────────────────────────────────────────────────────
function RetentionFormDialog({
  open, onClose, editing, month, year,
}: {
  open: boolean; onClose: () => void; editing: FiscalRetention | null; month: number; year: number;
}) {
  const { data: properties = [] } = useProperties();
  const create = useCreateFiscalRetention();
  const update = useUpdateFiscalRetention();

  const [propertyId, setPropertyId] = useState(editing?.property_id ?? "");
  const [tipo, setTipo] = useState(editing?.tipo ?? "ISR");
  const [concepto, setConcepto] = useState(editing?.concepto ?? CONCEPTOS_RETENCION[0].value);
  const [beneficiarioRnc, setBeneficiarioRnc] = useState(editing?.beneficiario_rnc ?? "");
  const [beneficiarioTipoId, setBeneficiarioTipoId] = useState(editing?.beneficiario_tipo_id ?? 2);
  const [beneficiarioNombre, setBeneficiarioNombre] = useState(editing?.beneficiario_nombre ?? "");
  const [fecha, setFecha] = useState(editing?.fecha ?? new Date().toISOString().slice(0, 10));
  const [montoBase, setMontoBase] = useState(editing?.monto_base ?? 0);
  const [tasaRetencion, setTasaRetencion] = useState(editing?.tasa_retencion ?? 10);
  const [ncfRelacionado, setNcfRelacionado] = useState(editing?.ncf_relacionado ?? "");
  const [notas, setNotas] = useState(editing?.notas ?? "");

  const montoRetenido = +(montoBase * tasaRetencion / 100).toFixed(2);

  function onConceptoChange(val: string) {
    setConcepto(val);
    const c = CONCEPTOS_RETENCION.find(x => x.value === val);
    if (c) {
      if (tipo === "ISR") setTasaRetencion(c.tasaISR);
      else setTasaRetencion(c.tasaITBIS);
    }
  }

  async function handleSave() {
    if (!beneficiarioRnc.trim()) {
      toast({ title: "RNC/Cédula del beneficiario es requerido", variant: "destructive" });
      return;
    }
    const retention: FiscalRetentionInsert = {
      property_id: propertyId || null,
      tipo,
      concepto,
      beneficiario_rnc: beneficiarioRnc.trim(),
      beneficiario_tipo_id: beneficiarioTipoId,
      beneficiario_nombre: beneficiarioNombre || null,
      fecha,
      monto_base: montoBase,
      tasa_retencion: tasaRetencion,
      monto_retenido: montoRetenido,
      ncf_relacionado: ncfRelacionado || null,
      periodo_mes: month,
      periodo_year: year,
      status: "Pendiente",
      notas: notas.trim() || null,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...retention });
        toast({ title: "Retención actualizada" });
      } else {
        await create.mutateAsync(retention);
        toast({ title: "Retención registrada" });
      }
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Retención" : "Nueva Retención"}</DialogTitle>
          <DialogDescription>Retención aplicada a terceros (IR-17)</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="ISR">ISR</option>
                <option value="ITBIS">ITBIS</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Concepto</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={concepto} onChange={(e) => onConceptoChange(e.target.value)}>
                {CONCEPTOS_RETENCION.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo ID</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={beneficiarioTipoId} onChange={(e) => setBeneficiarioTipoId(+e.target.value)}>
                <option value={1}>RNC</option>
                <option value={2}>Cédula</option>
                <option value={3}>Pasaporte</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">RNC/Cédula *</label>
              <Input value={beneficiarioRnc} onChange={(e) => setBeneficiarioRnc(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre</label>
              <Input value={beneficiarioNombre} onChange={(e) => setBeneficiarioNombre(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Monto Base</label>
              <Input type="number" step="0.01" min="0" value={montoBase || ""} onChange={(e) => setMontoBase(+e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tasa (%)</label>
              <Input type="number" step="0.01" min="0" max="100" value={tasaRetencion} onChange={(e) => setTasaRetencion(+e.target.value)} />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <p className="text-[10px] text-amber-600 font-medium">Monto Retenido</p>
              <p className="text-sm font-bold text-amber-700">{fmtCurrency(montoRetenido)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha</label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">NCF Relacionado</label>
              <Input value={ncfRelacionado} onChange={(e) => setNcfRelacionado(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Propiedad</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">General</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notas</label>
            <textarea className="w-full border rounded-md px-3 py-2 text-sm bg-white resize-none" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : editing ? "Actualizar" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main ────────────────────────────────────────────────────────────
export function RetencionesTab({ fiscalPropertyId }: { fiscalPropertyId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FiscalRetention | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FiscalRetention | null>(null);

  const selectedPropertyId = fiscalPropertyId;
  const { data: retentions = [], isLoading } = useFiscalRetentions();
  const deleteRetention = useDeleteFiscalRetention();

  function prevMonth() { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); }

  const filtered = useMemo(() => {
    let list = retentions.filter(r => r.periodo_mes === month && r.periodo_year === year);
    if (selectedPropertyId) list = list.filter(r => r.property_id === selectedPropertyId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.concepto.toLowerCase().includes(q) ||
        (r.beneficiario_nombre ?? "").toLowerCase().includes(q) ||
        r.beneficiario_rnc.includes(q)
      );
    }
    return list;
  }, [retentions, month, year, selectedPropertyId, search]);

  const totalISR = filtered.filter(r => r.tipo === "ISR").reduce((s, r) => s + r.monto_retenido, 0);
  const totalITBIS = filtered.filter(r => r.tipo === "ITBIS").reduce((s, r) => s + r.monto_retenido, 0);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try { await deleteRetention.mutateAsync(deleteTarget.id); toast({ title: "Retención eliminada" }); }
    catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#0F2B4C]">Retenciones (IR-17)</h2>
          <p className="text-xs text-muted-foreground">ISR e ITBIS retenido a terceros — declarar primeros 10 días del mes siguiente</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={14} className="mr-1" /> Nueva Retención
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1 bg-[#0F2B4C]/5 rounded-xl px-4 py-2.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft size={16} /></Button>
        <span className="text-sm font-semibold text-[#0F2B4C] min-w-[130px] text-center">{MONTHS[month]} {year}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight size={16} /></Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-3 shadow-sm">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Retenciones</p>
          <p className="text-lg font-bold text-[#0F2B4C]">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 shadow-sm">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">ISR Retenido</p>
          <p className="text-lg font-bold text-purple-600">{fmtCurrency(totalISR)}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 shadow-sm">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">ITBIS Retenido</p>
          <p className="text-lg font-bold text-amber-600">{fmtCurrency(totalITBIS)}</p>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por concepto, beneficiario…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white" />
        {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}><X size={14} /></button>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-[#2D6A9F] border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No hay retenciones en este período.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ret) => (
            <div key={ret.id} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ret.tipo === "ISR" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"}`}>{ret.tipo}</span>
                    <span className="text-sm font-semibold text-[#0F2B4C]">{ret.concepto}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{fmtDate(ret.fecha)}</span>
                    {ret.beneficiario_nombre && <span>{ret.beneficiario_nombre}</span>}
                    <span className="font-mono">{ret.beneficiario_rnc}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm text-[#0F2B4C]">{fmtCurrency(ret.monto_retenido)}</div>
                  <div className="text-[10px] text-muted-foreground">Base: {fmtCurrency(ret.monto_base)} × {ret.tasa_retencion}%</div>
                </div>
              </div>
              <div className="flex justify-end gap-1 mt-2 pt-2 border-t">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(ret); setFormOpen(true); }}><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteTarget(ret)}><Trash2 size={13} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && <RetentionFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} editing={editing} month={month} year={year} />}

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle size={18} className="text-red-500" /> Eliminar retención</DialogTitle>
            <DialogDescription>¿Eliminar esta retención?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteRetention.isPending}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
