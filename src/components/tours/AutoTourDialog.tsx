import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Check, Loader2, Plus, Route, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { TourHotspot, TourScene } from "@/lib/tours";
import { arrowRows, existingDirections, pairKey, proposeLinks } from "./autoLinks";

// Vista previa de "Generar recorrido": lista de conexiones propuestas (según el área de cada foto)
// que el admin puede quitar o completar antes de crear las flechas. Las ya existentes se muestran aparte.

interface Row {
  a: string;
  b: string;
  why: string;
  on: boolean;
}

export function AutoTourDialog({ open, scenes, hotspots, onClose, onCreate }: {
  open: boolean;
  scenes: TourScene[];
  hotspots: TourHotspot[];
  onClose(): void;
  onCreate(rows: Omit<TourHotspot, "id">[]): Promise<boolean>;
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

  // Conexiones que ya existen (con al menos una flecha) y que no están en la propuesta
  const existing = useMemo(() => {
    const seen = new Set<string>();
    const list: { a: string; b: string }[] = [];
    for (const d of dirs) {
      const [a, b] = d.split(">");
      if (!index.has(a) || !index.has(b) || seen.has(pairKey(a, b))) continue;
      seen.add(pairKey(a, b));
      list.push({ a, b });
    }
    return list;
  }, [dirs, index]);

  useEffect(() => {
    if (!open) return;
    // Lo que ya está conectado en las dos direcciones no se vuelve a proponer
    setRows(proposeLinks(scenes).filter((p) => state(p.a, p.b) !== "both").map((p) => ({ ...p, on: true })));
    setNewA("");
    setNewB("");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const noArea = scenes.filter((s) => !s.area?.trim());
  const toCreate = useMemo(() => arrowRows(rows.filter((r) => r.on), scenes, hotspots), [rows, scenes, hotspots]);
  const proposed = new Set(rows.map((r) => pairKey(r.a, r.b)));
  const shownExisting = existing.filter((e) => !proposed.has(pairKey(e.a, e.b)));

  function addRow() {
    if (!newA || !newB || newA === newB) return;
    const k = pairKey(newA, newB);
    if (proposed.has(k)) {
      setRows((r) => r.map((x) => (pairKey(x.a, x.b) === k ? { ...x, on: true } : x)));
    } else {
      setRows((r) => [...r, { a: newA, b: newB, why: "Añadida a mano", on: true }]);
    }
    setNewB("");
  }

  async function create() {
    setBusy(true);
    const ok = await onCreate(toCreate);
    setBusy(false);
    if (ok) onClose();
  }

  const select = "flex-1 min-w-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Route size={18} className="text-[#F0A030]" /> Generar recorrido</DialogTitle>
          <DialogDescription>
            Estas son las conexiones que salen del nombre del área de cada foto. Quita las que no van y añade las que falten.
            Cada conexión crea dos flechas (ida y vuelta) con el nombre del área. Después revisas foto por foto y
            arrastras cada flecha hasta su puerta.
          </DialogDescription>
        </DialogHeader>

        {noArea.length > 0 && (
          <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            {noArea.length === 1 ? "1 foto no tiene área" : `${noArea.length} fotos no tienen área`} ({noArea.map((s) => name(s.id)).join(", ")}):
            se conectan con la foto anterior. Escríbeles el área en la cuadrícula para un mejor resultado.
          </p>
        )}

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
          {rows.length === 0 && (
            <p className="text-xs text-gray-500 py-4 text-center">No hay conexiones nuevas que proponer: todas las fotos ya están conectadas.</p>
          )}
          {rows.map((r, i) => {
            const st = state(r.a, r.b);
            return (
              <label key={pairKey(r.a, r.b)} className={cn("flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs cursor-pointer", r.on ? "border-gray-200 bg-white" : "border-dashed border-gray-200 bg-gray-50 text-gray-400")}>
                <input
                  type="checkbox"
                  checked={r.on}
                  onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, on: e.target.checked } : y)))}
                  className="accent-[#F0A030]"
                />
                <span className="font-semibold min-w-0 truncate">{name(r.a)}</span>
                <ArrowLeftRight size={13} className="shrink-0 text-[#F0A030]" />
                <span className="font-semibold min-w-0 truncate">{name(r.b)}</span>
                <span className="ml-auto shrink-0 text-[11px] text-gray-400">{st === "one" ? "Falta la flecha de vuelta" : r.why}</span>
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

          {shownExisting.length > 0 && (
            <div className="pt-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Ya conectadas ({shownExisting.length})</h4>
              <ul className="space-y-0.5">
                {shownExisting.map((e) => (
                  <li key={pairKey(e.a, e.b)} className="flex items-center gap-2 px-2.5 text-xs text-gray-500">
                    <Check size={12} className="text-green-600 shrink-0" />
                    <span className="truncate">{name(e.a)}</span>
                    <ArrowLeftRight size={12} className="shrink-0" />
                    <span className="truncate">{name(e.b)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            <X size={14} className="mr-1" /> Cancelar
          </Button>
          <Button disabled={busy || toCreate.length === 0} onClick={create} className="bg-[#F0A030] text-[#0F2B4C] hover:bg-[#e5952a]">
            {busy ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Route size={14} className="mr-1.5" />}
            Crear {toCreate.length} {toCreate.length === 1 ? "flecha" : "flechas"} y revisar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
