import { useState, useEffect, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import type { PlatformConfig } from "@/types/database";

interface PlatformFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PlatformConfig | null;
  onSave: (data: {
    platform: string;
    commission_pct: number;
    fixed_amount_usd: number;
    marketing_pct: number;
    notes: string;
    active: boolean;
  }) => Promise<void>;
  saving: boolean;
}

const EMPTY = {
  platform: "",
  commission_pct: "",
  fixed_amount_usd: "",
  marketing_pct: "",
  notes: "",
  active: true,
};

export function PlatformFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
  saving,
}: PlatformFormDialogProps) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (editing) {
      setForm({
        platform:         editing.platform,
        commission_pct:   String(editing.commission_pct),
        fixed_amount_usd: String(editing.fixed_amount_usd),
        marketing_pct:    String(editing.marketing_pct ?? 0),
        notes:            editing.notes ?? "",
        active:           editing.active,
      });
    } else {
      setForm(EMPTY);
    }
  }, [editing, open]);

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSave({
      platform:         form.platform.trim(),
      commission_pct:   parseFloat(form.commission_pct)   || 0,
      fixed_amount_usd: parseFloat(form.fixed_amount_usd) || 0,
      marketing_pct:    parseFloat(form.marketing_pct)    || 0,
      notes:            form.notes.trim(),
      active:           form.active,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar plataforma" : "Nueva plataforma"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Modifica los datos de la plataforma."
              : "Agrega una nueva plataforma de renta vacacional."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="platform">Nombre de plataforma *</Label>
            <Input
              id="platform"
              placeholder="Airbnb, VRBO, Booking…"
              value={form.platform}
              onChange={(e) => set("platform", e.target.value)}
              required
            />
          </div>

          {/* Row 1: commission % + fixed USD */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="commission_pct">Comisión (%)</Label>
              <div className="relative">
                <Input
                  id="commission_pct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="15.00"
                  value={form.commission_pct}
                  onChange={(e) => set("commission_pct", e.target.value)}
                  className="pr-7"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fixed_amount_usd">Monto fijo (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  id="fixed_amount_usd"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.fixed_amount_usd}
                  onChange={(e) => set("fixed_amount_usd", e.target.value)}
                  className="pl-6"
                />
              </div>
            </div>
          </div>

          {/* Row 2: marketing % */}
          <div className="space-y-2">
            <Label htmlFor="marketing_pct" className="flex items-center gap-2">
              Marketing / Promo (%)
              <span className="text-[10px] font-normal text-muted-foreground">
                — se suma a la comisión al calcular el neto
              </span>
            </Label>
            <div className="relative max-w-[160px]">
              <Input
                id="marketing_pct"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0.00"
                value={form.marketing_pct}
                onChange={(e) => set("marketing_pct", e.target.value)}
                className="pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            {/* Live preview of combined rate */}
            {(parseFloat(form.commission_pct) > 0 || parseFloat(form.marketing_pct) > 0) && (
              <p className="text-[11px] text-muted-foreground pl-0.5">
                Comisión total:{" "}
                <span className="font-semibold text-foreground">
                  {(parseFloat(form.commission_pct) || 0) + (parseFloat(form.marketing_pct) || 0)}%
                </span>
                {parseFloat(form.fixed_amount_usd) > 0 && (
                  <> + <span className="font-semibold text-foreground">${parseFloat(form.fixed_amount_usd).toFixed(2)} fijo</span></>
                )}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Input
              id="notes"
              placeholder="Detalles adicionales…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Activa</p>
              <p className="text-xs text-muted-foreground">
                Las plataformas inactivas no aparecen en reportes
              </p>
            </div>
            <Switch
              checked={form.active}
              onCheckedChange={(v) => set("active", v)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={13} className="mr-2 animate-spin" />
                  Guardando…
                </>
              ) : editing ? (
                "Guardar cambios"
              ) : (
                "Crear plataforma"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
