import { useState } from "react";
import { Hash, Settings, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useNcfSequences, useUpdateNcfSequence, useFiscalConfig, useUpdateFiscalConfig } from "@/hooks/useFiscal";
import type { NcfSequence, FiscalConfig } from "@/types/fiscal";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export function NcfTab() {
  const { data: sequences = [], isLoading } = useNcfSequences();
  const { data: config } = useFiscalConfig();
  const [editSeq, setEditSeq] = useState<NcfSequence | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <div className="space-y-5">
      {/* Company fiscal info */}
      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-[#0F2B4C] uppercase tracking-wider">Datos Fiscales de la Empresa</h3>
          <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
            <Settings size={13} className="mr-1" /> Editar
          </Button>
        </div>
        {config && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">RNC</p>
              <p className="font-mono font-semibold">{config.rnc}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Razón Social</p>
              <p className="font-semibold">{config.razon_social}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Régimen</p>
              <p className="font-semibold">{config.regimen}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Cierre Fiscal</p>
              <p className="font-semibold">{config.fecha_cierre_fiscal}</p>
            </div>
          </div>
        )}
      </div>

      {/* NCF Sequences */}
      <div>
        <h3 className="text-sm font-bold text-[#0F2B4C] mb-3">Secuencias NCF / e-CF</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Gestiona las secuencias de comprobantes fiscales electrónicos autorizados por la DGII.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8"><div className="w-7 h-7 border-2 border-[#2D6A9F] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid gap-3">
            {sequences.map((seq) => (
              <div key={seq.id} className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#0F2B4C]/5">
                      <Hash size={16} className="text-[#0F2B4C]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#0F2B4C]">{seq.prefijo}</span>
                        <span className="text-xs text-muted-foreground">{seq.nombre}</span>
                        {seq.activo ? (
                          <CheckCircle size={12} className="text-green-500" />
                        ) : (
                          <XCircle size={12} className="text-red-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                        <span>Actual: <strong className="text-[#0F2B4C]">{seq.secuencia_actual}</strong></span>
                        <span>Rango: {seq.secuencia_desde} — {seq.secuencia_hasta.toLocaleString()}</span>
                        {seq.fecha_vencimiento && <span>Vence: {seq.fecha_vencimiento}</span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditSeq(seq)}>Editar</Button>
                </div>
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F0A030] rounded-full transition-all"
                      style={{ width: `${Math.min(100, (seq.secuencia_actual / seq.secuencia_hasta) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">
                    {((seq.secuencia_actual / seq.secuencia_hasta) * 100).toFixed(2)}% usado
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit sequence dialog */}
      {editSeq && <EditSequenceDialog seq={editSeq} onClose={() => setEditSeq(null)} />}

      {/* Edit config dialog */}
      {configOpen && config && <EditConfigDialog config={config} onClose={() => setConfigOpen(false)} />}
    </div>
  );
}

function EditSequenceDialog({ seq, onClose }: { seq: NcfSequence; onClose: () => void }) {
  const update = useUpdateNcfSequence();
  const [secActual, setSecActual] = useState(seq.secuencia_actual);
  const [secDesde, setSecDesde] = useState(seq.secuencia_desde);
  const [secHasta, setSecHasta] = useState(seq.secuencia_hasta);
  const [activo, setActivo] = useState(seq.activo);
  const [fechaVenc, setFechaVenc] = useState(seq.fecha_vencimiento ?? "");

  async function handleSave() {
    try {
      await update.mutateAsync({
        id: seq.id,
        secuencia_actual: secActual,
        secuencia_desde: secDesde,
        secuencia_hasta: secHasta,
        activo,
        fecha_vencimiento: fechaVenc || null,
      });
      toast({ title: "Secuencia actualizada" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Secuencia {seq.prefijo}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
              <Input type="number" value={secDesde} onChange={(e) => setSecDesde(+e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
              <Input type="number" value={secHasta} onChange={(e) => setSecHasta(+e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Actual</label>
              <Input type="number" value={secActual} onChange={(e) => setSecActual(+e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fecha Vencimiento</label>
              <Input type="date" value={fechaVenc} onChange={(e) => setFechaVenc(e.target.value)} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="rounded" />
                <span className="text-sm">Activo</span>
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditConfigDialog({ config, onClose }: { config: FiscalConfig; onClose: () => void }) {
  const update = useUpdateFiscalConfig();
  const [rnc, setRnc] = useState(config.rnc);
  const [razonSocial, setRazonSocial] = useState(config.razon_social);
  const [nombreComercial, setNombreComercial] = useState(config.nombre_comercial);
  const [actividad, setActividad] = useState(config.actividad_economica);
  const [regimen, setRegimen] = useState(config.regimen);
  const [cierreFiscal, setCierreFiscal] = useState(config.fecha_cierre_fiscal);
  const [direccion, setDireccion] = useState(config.direccion ?? "");
  const [telefono, setTelefono] = useState(config.telefono ?? "");
  const [email, setEmail] = useState(config.email ?? "");

  async function handleSave() {
    try {
      await update.mutateAsync({
        id: config.id,
        rnc, razon_social: razonSocial, nombre_comercial: nombreComercial,
        actividad_economica: actividad, regimen, fecha_cierre_fiscal: cierreFiscal,
        direccion: direccion || null, telefono: telefono || null, email: email || null,
      });
      toast({ title: "Configuración fiscal actualizada" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configuración Fiscal</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">RNC</label>
              <Input value={rnc} onChange={(e) => setRnc(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Razón Social</label>
              <Input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nombre Comercial</label>
              <Input value={nombreComercial} onChange={(e) => setNombreComercial(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Actividad Económica</label>
              <Input value={actividad} onChange={(e) => setActividad(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Régimen</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={regimen} onChange={(e) => setRegimen(e.target.value)}>
                <option value="Regular">Regular</option>
                <option value="RST">RST (Simplificado)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cierre Fiscal</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={cierreFiscal} onChange={(e) => setCierreFiscal(e.target.value)}>
                <option value="31/12">31 de Diciembre</option>
                <option value="31/03">31 de Marzo</option>
                <option value="30/06">30 de Junio</option>
                <option value="30/09">30 de Septiembre</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Dirección</label>
              <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
