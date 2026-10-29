import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Loader2, Plus, RotateCcw, Route, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { TourHotspot, TourScene } from "@/lib/tours";
import { PanoThumb } from "./PanoThumb";
import { arrowRows, existingDirections, pairKey, proposeLinks } from "./autoLinks";

// "Generar recorrido": lista de conexiones entre fotos (con miniaturas). Junta las que ya existen
// con las que se proponen según el área de cada foto. El admin marca/desmarca: las nuevas marcadas
// crean sus flechas (ida y vuelta) y las existentes desmarcadas borran sus flechas. Se puede volver
// a abrir en cualquier momento para editar el recorrido o "volver a sugerir" tras cambiar las áreas.

interface Row {
  a: string;
  b: string;
  why: string;
  on: boolean;
}

export function AutoTourDialog({ open, scenes, hotspots, onClose, onApply }: {
  open: boolean;
  scenes: TourScene[];
  hotspots: TourHotspot[];
  onClose(): void;
  /** Crea las flechas nuevas y borra las de las conexiones quitadas */
  onApply(create: Omit<TourHotspot, "id">[], remove: TourHotspot[]): Promise<boolean>;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [newA, setNewA] = useState("");
  const [newB, setNewB] = useState("");
  const [busy, setBusy] = useState(false);

  const index = useMemo(() => new Map(scenes.map((s, i) => [s.id, i])), [scenes]);
  const name = (id: string) => {
    const i = index.get(id) ?? 0;
    const s = scenes[i];
    return `${i + 1}. ${s?.area?.trim() || s?.title || "Foto"}`;
  };
  const dirs = useMemo(() => existingDirections(hotspots), [hotspots]);
  const state = (a: string, b: string) => {
    const ab = dirs.has(`${a}>${b}`), ba = dirs.has(`${b}>${a}`);
    return ab && ba ? "both" : ab || ba ? "one" : "none";
  };

  // Lo que hay ahora + lo que se sugiere (sin repetir)
  function buildRows(): Row[] {
    const out = new Map<string, Row>();
    for (const p of proposeLinks(scenes)) out.set(pairKey(p.a, p.b), { ...p, on: true });
    for (const d of dirs) {
      const [a, b] = d.split(">");
      if (!index.has(a) || !index.has(b) || out.has(pairKey(a, b))) continue;
      out.set(pairKey(a, b), { a, b, why: "Hecha a mano", on: true });
    }
    return [...out.values()];
  }

  useEffect(() => {
    if (!open) return;
    setRows(buildRows());
    setNewA("");
    setNewB("");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toCreate = useMemo(() => arrowRows(rows.filter((r) => r.on), scenes, hotspots), [rows, scenes, hotspots]);
  const toRemove = useMemo(() => {
    const off = new Set(rows.filter((r) => !r.on).map((r) => pairKey(r.a, r.b)));
    return hotspots.filter((h) => h.action === "scene" && h.target_scene_id && !h.master && off.has(pairKey(h.scene_id, h.target_scene_id)));
  }, [rows, hotspots]);
  const noArea = scenes.filter((s) => !s.area?.trim());

  function addRow() {
    if (!newA || !newB || newA === newB) return;
    const k = pairKey(newA, newB);
    if (rows.some((r) => pairKey(r.a, r.b) === k)) setRows((r) => r.map((x) => (pairKey(x.a, x.b) === k ? { ...x, on: true } : x)));
    else setRows((r) => [...r, { a: newA, b: newB, why: "Añadida a mano", on: true }]);
    setNewB("");
  }

  async function apply() {
    if (toRemove.length && !confirm(`Se borrarán ${toRemove.length} ${toRemove.length === 1 ? "flecha" : "flechas"} de las conexiones que quitaste. ¿Seguir?`)) return;
    setBusy(true);
    const ok = await onApply(toCreate, toRemove);
    setBusy(false);
    if (ok) onClose();
  }

  const select = "flex-1 min-w-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs";
  const Photo = ({ id }: { id: string }) => {
    const s = scenes[index.get(id) ?? 0];
    return (
      <span className="flex items-center gap-2 min-w-0 flex-1">
        <PanoThumb src={s?.thumb_url} yaw={s?.initial_yaw} pitch={s?.initial_pitch} fov={s?.fov_initial} className="w-12 h-12 shrink-0 rounded-md" />
        <span className="font-semibold truncate">{name(id)}</span>
      </span>
    );
  };
  const label = [
    toCreate.length ? `Crear ${toCreate.length} ${toCreate.length === 1 ? "flecha" : "flechas"}` : "",
    toRemove.length ? `borrar ${toRemove.length}` : "",
  ].filter(Boolean).join(" y ");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Route size={18} className="text-[#F0A030]" /> Generar recorrido</DialogTitle>
          <DialogDescription>
            Estas son las conexiones entre fotos: las que ya tiene el tour y las que se sugieren según el área de cada foto.
            Desmarca las que no van (sus flechas se borran) y añade las que falten. Cada conexión tiene dos flechas: ida y vuelta.
          </DialogDescription>
        </DialogHeader>

        {noArea.length > 0 && (
          <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            {noArea.length === 1 ? "1 foto no tiene área" : `${noArea.length} fotos no tienen área`} ({noArea.map((s) => name(s.id)).join(", ")}):
            se conectan con la foto anterior. Escríbeles el área en la cuadrícula para un mejor resultado.
          </p>
        )}

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1.5">
          {rows.map((r, i) => {
            const st = state(r.a, r.b);
            const status = !r.on
              ? st === "none" ? "No se creará" : "Se borrarán sus flechas"
              : st === "both" ? "Ya conectadas" : st === "one" ? "Falta la flecha de vuelta" : `Nueva · ${r.why}`;
            return (
              <label
                key={pairKey(r.a, r.b)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs cursor-pointer",
                  r.on ? "border-gray-200 bg-white" : "border-dashed border-gray-200 bg-gray-50 opacity-60"
                )}
              >
                <input
                  type="checkbox"
                  checked={r.on}
                  onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, on: e.target.checked } : y)))}
                  className="accent-[#F0A030] shrink-0"
                />
                <Photo id={r.a} />
                <ArrowLeftRight size={14} className="shrink-0 text-[#F0A030]" />
                <Photo id={r.b} />
                <span
                  className={cn(
                    "w-28 shrink-0 text-right text-[11px] leading-tight",
                    !r.on && st !== "none" ? "text-red-600 font-semibold" : st === "both" && r.on ? "text-green-700" : st === "none" ? "text-[#b8761a]" : "text-gray-500"
                  )}
                >
                  {status}
                </span>
              </label>
            );
          })}

          <div className="flex items-center gap-2 pt-2">
            <select value={newA} onChange={(e) => setNewA(e.target.value)} className={select}>
              <option value="">Conectar…</option>
              {scenes.map((s) => <option key={s.id} value={s.id}>{name(s.id)}</option>)}
            </select>
            <ArrowLeftRight size={13} className="shrink-0 text-gray-400" />
            <select value={newB} onChange={(e) => setNewB(e.target.value)} className={select}>
              <option value="">…con</option>
              {scenes.filter((s) => s.id !== newA).map((s) => <option key={s.id} value={s.id}>{name(s.id)}</option>)}
            </select>
            <Button size="sm" variant="outline" disabled={!newA || !newB} onClick={addRow}>
              <Plus size={14} className="mr-1" /> Añadir
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 sm:justify-between">
          <Button variant="ghost" disabled={busy} onClick={() => setRows(buildRows())} title="Vuelve a la sugerencia (útil si cambiaste las áreas de las fotos)">
            <RotateCcw size={14} className="mr-1.5" /> Volver a sugerir
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={busy} onClick={onClose}>
              <X size={14} className="mr-1" /> Cancelar
            </Button>
            <Button disabled={busy || (!toCreate.length && !toRemove.length)} onClick={apply} className="bg-[#F0A030] text-[#0F2B4C] hover:bg-[#e5952a]">
              {busy ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Route size={14} className="mr-1.5" />}
              {label ? `${label[0].toUpperCase()}${label.slice(1)}` : "Sin cambios"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
