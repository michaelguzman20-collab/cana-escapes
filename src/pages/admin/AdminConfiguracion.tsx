import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  usePlatformConfigs,
  useCreatePlatformConfig,
  useUpdatePlatformConfig,
  useDeletePlatformConfig,
} from "@/hooks/usePlatformConfigs";
import { useProperties, useCreateProperty, useUpdateProperty } from "@/hooks/useProperties";
import {
  useBrackets, useUpdateBracket, resolveBracketsForProperty,
  hasCustomBrackets, useCustomizePropertyBrackets, useResetPropertyBrackets,
} from "@/hooks/useBrackets";
import { useGuestUsers, useUnlinkGuestProperty } from "@/hooks/useGuestUsers";
import { useAccessLogs } from "@/hooks/useAccessLogs";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PlatformFormDialog } from "./PlatformFormDialog";
import {
  Plus, Pencil, Trash2, CheckCircle2, XCircle, AlertTriangle,
  UserPlus, Loader2, Users, Home, Unlink, RefreshCw,
  Building2, Share2, Copy, Check, Eye, EyeOff,
  Award, Target, Settings2, Globe, LogIn, LogOut, Monitor,
  ShieldAlert, X, Save,
} from "lucide-react";
import { useProperty } from "@/contexts/PropertyContext";
import type { PlatformConfig, Property, Bracket } from "@/types/database";
import type { AccessLog } from "@/hooks/useAccessLogs";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-DO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Tab definitions ───────────────────────────────────────────────────────────
type Tab = "propiedades" | "plataformas" | "brackets" | "accesos";

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "propiedades", label: "Propiedades",  icon: Building2, desc: "Gestión de propiedades y enlaces al propietario" },
  { id: "plataformas", label: "Plataformas",  icon: Globe,     desc: "Comisiones y configuración de canales de venta" },
  { id: "brackets",    label: "Brackets",     icon: Award,     desc: "Tabla de brackets de distribución — editable con confirmación" },
  { id: "accesos",     label: "Accesos",      icon: Users,     desc: "Usuarios propietarios, permisos e historial de actividad" },
];

// ── Property form dialog ──────────────────────────────────────────────────────
function PropertyFormDialog({
  open, onOpenChange, editing, onSave, saving,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Property | null;
  onSave: (d: { name: string; owner_name: string; reference_rate: number }) => Promise<void>;
  saving: boolean;
}) {
  const [name,      setName]      = useState(editing?.name ?? "");
  const [ownerName, setOwnerName] = useState(editing?.owner_name ?? "");
  const [rate,      setRate]      = useState(String(editing?.reference_rate ?? 60));

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setOwnerName(editing?.owner_name ?? "");
    setRate(String(editing?.reference_rate ?? 60));
  }, [editing, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({ name, owner_name: ownerName, reference_rate: parseFloat(rate) || 60 });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">{editing ? "Editar propiedad" : "Nueva propiedad"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nombre de la propiedad</Label>
            <Input placeholder="Ej. Villa Coral" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Nombre del propietario</Label>
            <Input placeholder="Nombre completo" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Tasa de referencia USD→RD$</Label>
            <Input type="number" step="0.01" min="1" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear propiedad"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Propiedades tab ───────────────────────────────────────────────────────────
function PropiedadesTab() {
  const { data: properties = [], isLoading } = useProperties();
  const { selectedPropertyId } = useProperty();
  const createProp = useCreateProperty();
  const updateProp = useUpdateProperty();

  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState<Property | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rateConfirm, setRateConfirm] = useState<{ data: { name: string; owner_name: string; reference_rate: number }; oldRate: number } | null>(null);

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(p: Property) { setEditing(p); setFormOpen(true); }

  async function handleSave(data: { name: string; owner_name: string; reference_rate: number }) {
    if (editing && data.reference_rate !== editing.reference_rate) {
      setRateConfirm({ data, oldRate: editing.reference_rate });
      return;
    }
    await doSave(data);
  }

  async function doSave(data: { name: string; owner_name: string; reference_rate: number }) {
    if (editing) {
      await updateProp.mutateAsync({ id: editing.id, ...data });
    } else {
      await createProp.mutateAsync(data);
    }
    setFormOpen(false);
    setEditing(null);
  }

  async function confirmRateChange() {
    if (!rateConfirm) return;
    await doSave(rateConfirm.data);
    setRateConfirm(null);
  }

  async function toggleShare(p: Property) {
    await updateProp.mutateAsync({ id: p.id, share_enabled: !p.share_enabled });
  }

  function copyLink(p: Property) {
    if (!p.share_token) return;
    navigator.clipboard.writeText(`${window.location.origin}/compartir/${p.share_token}`);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const saving = createProp.isPending || updateProp.isPending;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Agrega y edita propiedades. Activa el enlace compartible para que cada propietario vea su resumen.
        </p>
        <Button onClick={openCreate} className="shrink-0 gap-1.5">
          <Plus size={14} /> Nueva propiedad
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map((i) => <Card key={i} className="animate-pulse h-24" />)}</div>
      ) : properties.length === 0 ? (
        <Card>
          <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
            <Building2 size={28} className="text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No hay propiedades configuradas.</p>
            <Button onClick={openCreate} size="sm"><Plus size={13} className="mr-1" />Crear primera propiedad</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {properties.map((p) => {
            const isActive = p.id === selectedPropertyId;
            return (
            <Card key={p.id} className={`overflow-hidden border transition-all ${isActive ? "ring-2 ring-[#0F2B4C]/40 border-[#0F2B4C]/30" : p.share_enabled ? "border-emerald-200" : "border-border"}`}>
              <div className={`h-[3px] w-full ${isActive ? "bg-[#0F2B4C]" : p.share_enabled ? "bg-emerald-500" : "bg-[#2D6A9F]"}`} />
              <CardContent className="px-5 py-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 size={15} className={isActive ? "text-[#0F2B4C]" : "text-[#2D6A9F]"} />
                      <h3 className="font-serif font-semibold text-base">{p.name}</h3>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#0F2B4C] text-white">
                          <CheckCircle2 size={9} /> Activa
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Propietario: <strong className="text-foreground">{p.owner_name}</strong>
                      {" · "}Tasa: <strong className="text-foreground">RD${p.reference_rate}</strong>
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="shrink-0 gap-1.5 text-muted-foreground">
                    <Pencil size={13} /> Editar
                  </Button>
                </div>

                <div className={`flex items-center justify-between rounded-lg px-4 py-3 gap-4 border ${
                  p.share_enabled ? "bg-emerald-50 border-emerald-200" : "bg-muted/30 border-border"
                }`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      p.share_enabled ? "bg-emerald-100" : "bg-muted"
                    }`}>
                      <Share2 size={14} className={p.share_enabled ? "text-emerald-700" : "text-muted-foreground"} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium">
                        {p.share_enabled ? "Enlace activo para el propietario" : "Enlace desactivado"}
                      </p>
                      {p.share_enabled && p.share_token && (
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">
                          {window.location.origin}/compartir/{p.share_token}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.share_enabled && (
                      <Button size="sm" variant="outline" onClick={() => copyLink(p)} className="h-7 px-2.5 text-xs gap-1.5">
                        {copiedId === p.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        {copiedId === p.id ? "¡Copiado!" : "Copiar"}
                      </Button>
                    )}
                    <div className="flex items-center gap-1.5">
                      {p.share_enabled ? <Eye size={13} className="text-emerald-600" /> : <EyeOff size={13} className="text-muted-foreground" />}
                      <Switch
                        checked={!!p.share_enabled}
                        onCheckedChange={() => toggleShare(p)}
                        disabled={updateProp.isPending}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <PropertyFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        editing={editing}
        onSave={handleSave}
        saving={saving}
      />

      {/* Rate change confirmation dialog */}
      <Dialog open={!!rateConfirm} onOpenChange={(v) => !v && setRateConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cambio de tasa</DialogTitle>
            <DialogDescription>
              Estás cambiando la tasa de referencia de <strong>RD${rateConfirm?.oldRate}</strong> a{" "}
              <strong>RD${rateConfirm?.data.reference_rate}</strong>.
              <br /><br />
              Esta tasa se usará como tasa de pago/desembolso en el Dashboard, Reservas y Propietarios.
              ¿Deseas continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateConfirm(null)}>Cancelar</Button>
            <Button onClick={confirmRateChange} disabled={updateProp.isPending}>
              {updateProp.isPending ? "Guardando…" : "Confirmar cambio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Plataformas tab ───────────────────────────────────────────────────────────
// ── Recalc state shape ────────────────────────────────────────────────────────
interface RecalcState {
  platform: string;
  commPct: number;
  marketingPct: number;
  fixed: number;
  count: number;
}

function PlataformasTab() {
  const qc = useQueryClient();
  const { data: platforms = [], isLoading } = usePlatformConfigs();
  const createMutation = useCreatePlatformConfig();
  const updateMutation = useUpdatePlatformConfig();
  const deleteMutation = useDeletePlatformConfig();

  const [formOpen,      setFormOpen]      = useState(false);
  const [editing,       setEditing]       = useState<PlatformConfig | null>(null);
  const [deleting,      setDeleting]      = useState<PlatformConfig | null>(null);
  const [recalcState,   setRecalcState]   = useState<RecalcState | null>(null);
  const [recalcLoading, setRecalcLoading] = useState(false);

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(p: PlatformConfig) { setEditing(p); setFormOpen(true); }

  async function handleSave(data: {
    platform: string; commission_pct: number; fixed_amount_usd: number; marketing_pct: number; notes: string; active: boolean;
  }) {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...data });
      setFormOpen(false);
      // After updating, check how many non-cancelled reservations exist for this platform
      const { count } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("platform", data.platform)
        .neq("status", "Cancelada");
      if (count && count > 0) {
        setRecalcState({
          platform:     data.platform,
          commPct:      data.commission_pct,
          marketingPct: data.marketing_pct,
          fixed:        data.fixed_amount_usd,
          count,
        });
      } else {
        toast({ title: "Plataforma actualizada", variant: "success" });
      }
    } else {
      await createMutation.mutateAsync(data);
      setFormOpen(false);
      toast({ title: "Plataforma creada", variant: "success" });
    }
  }

  async function handleRecalculate() {
    if (!recalcState) return;
    setRecalcLoading(true);
    try {
      // Fetch all non-cancelled reservations for this platform
      const { data: rows, error } = await supabase
        .from("reservations")
        .select("id, gross_amount, card_fee_usd, extra_usd, owner_pct, ce_pct, currency, exchange_rate")
        .eq("platform", recalcState.platform)
        .neq("status", "Cancelada");

      if (error) throw error;
      if (!rows?.length) { setRecalcState(null); return; }

      // Recompute each reservation's financials with the new commission
      const updates = rows.map((r) => {
        const platComm     = r.gross_amount * (recalcState.commPct     / 100) + recalcState.fixed;
        const marketingAmt = r.gross_amount * (recalcState.marketingPct / 100);
        const net          = Math.max(0, r.gross_amount - platComm - marketingAmt - r.card_fee_usd - r.extra_usd);
        const ownerAmt     = net * (r.owner_pct / 100);
        const ceAmt        = net * (r.ce_pct    / 100);
        const ownerRds     = r.currency === "USD"
          ? ownerAmt * r.exchange_rate
          : net * (r.owner_pct / 100);
        return {
          id:                r.id,
          platform_comm_pct: recalcState.commPct,
          platform_comm_usd: platComm,
          marketing_usd:     marketingAmt,
          net_amount:        net,
          owner_amount:      ownerAmt,
          ce_amount:         ceAmt,
          owner_rds:         ownerRds,
        };
      });

      const results = await Promise.all(
        updates.map(({ id, ...rest }) =>
          supabase.from("reservations").update(rest).eq("id", id)
        )
      );
      const updErr = results.find((r) => r.error)?.error;
      if (updErr) throw updErr;

      // Invalidate reservations cache so all menus refresh immediately
      await qc.invalidateQueries({ queryKey: ["reservations"] });

      toast({
        title: "Reservas recalculadas",
        description: `${rows.length} reserva${rows.length !== 1 ? "s" : ""} de ${recalcState.platform} actualizadas con comisión ${recalcState.commPct}%${recalcState.marketingPct > 0 ? ` + ${recalcState.marketingPct}% mkt` : ""}${recalcState.fixed > 0 ? ` + $${recalcState.fixed.toFixed(2)} fijo` : ""}.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast({ title: "Error al recalcular", description: msg, variant: "destructive" });
    } finally {
      setRecalcLoading(false);
      setRecalcState(null);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    await deleteMutation.mutateAsync(deleting.id);
    setDeleting(null);
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Comisiones por canal. El porcentaje y el monto fijo se deducen juntos al calcular el neto de cada reserva:{" "}
          <span className="font-medium text-foreground">Comisión = Bruto × % + Monto fijo</span>.
        </p>
        <Button onClick={openCreate} className="shrink-0 gap-1.5">
          <Plus size={14} /> Nueva plataforma
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Card key={i} className="animate-pulse h-20" />)}</div>
      ) : platforms.length === 0 ? (
        <Card>
          <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
            <Globe size={28} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No hay plataformas configuradas.</p>
            <Button onClick={openCreate} size="sm"><Plus size={13} className="mr-1" />Agregar primera plataforma</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {platforms.map((p) => (
            <Card key={p.id} className={`transition-opacity ${p.active ? "" : "opacity-55"}`}>
              <CardContent className="py-4 px-5">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-serif font-medium text-base">{p.platform}</h3>
                      <Badge variant={p.active ? "success" : "secondary"}>
                        {p.active
                          ? <><CheckCircle2 size={10} className="mr-1" />Activa</>
                          : <><XCircle size={10} className="mr-1" />Inactiva</>
                        }
                      </Badge>
                    </div>
                    {p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}
                  </div>
                  <div className="shrink-0 text-right space-y-0.5 min-w-[160px]">
                    <div className="flex items-baseline justify-end gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Com.</span>
                      <span className="text-xl font-serif font-bold">{p.commission_pct}%</span>
                      {(p.marketing_pct ?? 0) > 0 && (
                        <>
                          <span className="text-muted-foreground/50 text-sm">+</span>
                          <span className="text-base font-bold text-[#2D6A9F]">{p.marketing_pct}% mkt</span>
                        </>
                      )}
                      {p.fixed_amount_usd > 0 && (
                        <>
                          <span className="text-muted-foreground/50 text-sm">+</span>
                          <span className="text-base font-bold text-amber-600">${p.fixed_amount_usd.toFixed(0)} fijo</span>
                        </>
                      )}
                    </div>
                    {((p.marketing_pct ?? 0) > 0 || p.fixed_amount_usd > 0) && (
                      <p className="text-[10px] text-muted-foreground">
                        Total: <span className="font-semibold text-[#0F2B4C]">{p.commission_pct + (p.marketing_pct ?? 0)}% + ${p.fixed_amount_usd.toFixed(2)} fijo</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(p)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PlatformFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onSave={handleSave} saving={saving} />

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />Eliminar plataforma
            </DialogTitle>
            <DialogDescription>
              ¿Eliminar <strong>{deleting?.platform}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteMutation.isPending}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Recalculate reservations dialog ─────────────────────────────── */}
      <Dialog open={!!recalcState} onOpenChange={(v) => { if (!v && !recalcLoading) setRecalcState(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw size={18} className="text-[#2D6A9F]" />
              Actualizar reservas existentes
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p>
                  La configuración de <strong>{recalcState?.platform}</strong> fue actualizada.
                  Se encontraron <strong>{recalcState?.count}</strong> reserva{recalcState?.count !== 1 ? "s" : ""} activa{recalcState?.count !== 1 ? "s" : ""} para esta plataforma.
                </p>
                <div className="rounded-lg border border-[#2D6A9F]/20 bg-[#2D6A9F]/5 px-4 py-3 space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#2D6A9F]">Nueva comisión a aplicar</p>
                  <p className="text-sm font-semibold text-foreground">
                    {recalcState?.commPct}%
                    {recalcState && recalcState.marketingPct > 0 && (
                      <span className="text-[#2D6A9F]"> + {recalcState.marketingPct}% mkt</span>
                    )}
                    {recalcState && recalcState.fixed > 0 && (
                      <span className="text-amber-600"> + ${recalcState.fixed.toFixed(2)} fijo</span>
                    )}
                    {" "}por reserva
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  ¿Deseas recalcular las comisiones, neto, propietario y Cana Escapes de todas estas reservas con la nueva tarifa?
                  Esta acción actualizará los montos en Reservas, Plataformas y Dashboard.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setRecalcState(null); toast({ title: "Configuración guardada", description: "Las reservas existentes no fueron modificadas.", variant: "default" }); }}
              disabled={recalcLoading}
            >
              No, solo guardar
            </Button>
            <Button
              onClick={handleRecalculate}
              disabled={recalcLoading}
              className="gap-2 bg-[#2D6A9F] hover:bg-[#0F2B4C]"
            >
              {recalcLoading
                ? <><Loader2 size={14} className="animate-spin" />Recalculando…</>
                : <><RefreshCw size={14} />Sí, actualizar reservas</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Brackets tab (editable with confirmation) ─────────────────────────────────
interface BracketEditForm {
  range_min: string;
  range_max: string;
  owner_pct: string;
  ce_pct: string;
  description: string;
}

function BracketsTab() {
  const { selectedProperty, selectedPropertyId } = useProperty();
  const { data: allBrackets = [], isLoading } = useBrackets();
  const updateBracket = useUpdateBracket();
  const customize = useCustomizePropertyBrackets();
  const resetToTemplate = useResetPropertyBrackets();

  const isCustom = hasCustomBrackets(allBrackets, selectedPropertyId);
  const sorted = resolveBracketsForProperty(allBrackets, selectedPropertyId);
  const canEdit = !!selectedPropertyId && isCustom;

  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editForm,    setEditForm]    = useState<BracketEditForm | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [original,    setOriginal]    = useState<Bracket | null>(null);
  const [resetOpen,   setResetOpen]   = useState(false);

  function rangeLabel(b: Bracket) {
    const min = b.range_min === 0 ? "$0" : fmtUSD(b.range_min);
    const max = b.range_max != null ? fmtUSD(b.range_max) : null;
    return max ? `${min} — ${max}` : `${min}+`;
  }

  function startEdit(b: Bracket) {
    if (!canEdit) return;
    setEditingId(b.id);
    setOriginal(b);
    setEditForm({
      range_min:   String(b.range_min),
      range_max:   b.range_max != null ? String(b.range_max) : "",
      owner_pct:   String(b.owner_pct),
      ce_pct:      String(b.ce_pct),
      description: b.description ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
    setOriginal(null);
    setConfirmOpen(false);
  }

  async function handleCustomize() {
    if (!selectedPropertyId) return;
    await customize.mutateAsync(selectedPropertyId);
    toast({ title: "Bracket personalizado", description: `Ahora puedes editar los rangos de ${selectedProperty?.name ?? "esta propiedad"}.` });
  }

  async function handleReset() {
    if (!selectedPropertyId) return;
    await resetToTemplate.mutateAsync(selectedPropertyId);
    setResetOpen(false);
    cancelEdit();
    toast({ title: "Restablecido a plantilla", description: "La propiedad vuelve a usar la plantilla por defecto." });
  }

  function requestSave() {
    if (!editForm) return;
    const rMin = parseFloat(editForm.range_min);
    const rMax = editForm.range_max !== "" ? parseFloat(editForm.range_max) : null;
    if (isNaN(rMin) || rMin < 0) return;
    if (rMax !== null && rMax <= rMin) return;
    setConfirmOpen(true);
  }

  async function confirmSave() {
    if (!editingId || !editForm) return;
    await updateBracket.mutateAsync({
      id:          editingId,
      range_min:   parseFloat(editForm.range_min),
      range_max:   editForm.range_max !== "" ? parseFloat(editForm.range_max) : null,
      owner_pct:   parseFloat(editForm.owner_pct),
      ce_pct:      parseFloat(editForm.ce_pct),
      description: editForm.description || null,
    });
    cancelEdit();
  }

  // Build diff labels for the confirmation dialog
  const confirmChanges: { label: string; before: string; after: string }[] = useMemo(() => {
    if (!original || !editForm) return [];
    const changes: { label: string; before: string; after: string }[] = [];
    const origRangeMax = original.range_max != null ? String(original.range_max) : "";

    if (editForm.range_min !== String(original.range_min))
      changes.push({ label: "Desde (USD)", before: fmtUSD(original.range_min), after: fmtUSD(parseFloat(editForm.range_min) || 0) });
    if (editForm.range_max !== origRangeMax)
      changes.push({ label: "Hasta (USD)", before: original.range_max != null ? fmtUSD(original.range_max) : "Sin límite", after: editForm.range_max !== "" ? fmtUSD(parseFloat(editForm.range_max)) : "Sin límite" });
    if (editForm.owner_pct !== String(original.owner_pct))
      changes.push({ label: "Propietario %", before: `${original.owner_pct}%`, after: `${editForm.owner_pct}%` });
    if (editForm.ce_pct !== String(original.ce_pct))
      changes.push({ label: "Cana Escapes %", before: `${original.ce_pct}%`, after: `${editForm.ce_pct}%` });
    if (editForm.description !== (original.description ?? ""))
      changes.push({ label: "Descripción", before: original.description ?? "—", after: editForm.description || "—" });
    return changes;
  }, [original, editForm]);

  return (
    <div className="space-y-5">
      {/* Active-property banner */}
      {!selectedPropertyId ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Selecciona una <strong>propiedad activa</strong> (arriba a la izquierda) para personalizar su bracket. Abajo se muestra la <strong>plantilla por defecto</strong>.
          </p>
        </div>
      ) : (
        <div className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${isCustom ? "border-emerald-200 bg-emerald-50" : "border-[#2D6A9F]/20 bg-[#2D6A9F]/5"}`}>
          <div className="flex items-center gap-2.5">
            <Home size={16} className={isCustom ? "text-emerald-600" : "text-[#2D6A9F]"} />
            <div>
              <p className="text-sm font-semibold text-foreground">{selectedProperty?.name}</p>
              <p className="text-xs text-muted-foreground">
                {isCustom ? "Bracket personalizado para esta propiedad" : "Usando la plantilla por defecto"}
              </p>
            </div>
          </div>
          {isCustom ? (
            <Button size="sm" variant="outline" onClick={() => setResetOpen(true)} className="gap-1.5">
              <RefreshCw size={13} /> Restablecer a plantilla
            </Button>
          ) : (
            <Button size="sm" onClick={handleCustomize} disabled={customize.isPending} className="gap-1.5">
              {customize.isPending ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
              Personalizar para esta propiedad
            </Button>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Los brackets definen el porcentaje de distribución entre propietario y Cana Escapes según el ingreso bruto mensual.
        {canEdit
          ? " Edita los rangos en $ — los porcentajes son fijos para todas las propiedades."
          : " Personaliza la propiedad para poder editar sus rangos de forma independiente."}
      </p>

      {isLoading ? (
        <Card className="animate-pulse h-40" />
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
            <Award size={28} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No hay brackets configurados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#0F2B4C]/15">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0F2B4C] text-white">
                <th className="text-left   px-5 py-3 text-[11px] font-bold uppercase tracking-wider">Rango mensual (USD)</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider">Propietario %</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider">Cana Escapes %</th>
                <th className="text-left   px-4 py-3 text-[11px] font-bold uppercase tracking-wider">Descripción</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((b, i) => {
                const isEditing = editingId === b.id;
                return (
                  <tr key={b.id} className={`border-b last:border-0 transition-colors ${
                    isEditing ? "bg-amber-50/70" : i % 2 === 0 ? "" : "bg-muted/30"
                  }`}>
                    {/* Range */}
                    <td className="px-5 py-3">
                      {isEditing && editForm ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number" min="0" step="100"
                            value={editForm.range_min}
                            onChange={(e) => setEditForm((f) => f ? { ...f, range_min: e.target.value } : f)}
                            className="w-24 h-7 text-xs font-mono"
                          />
                          <span className="text-muted-foreground text-xs">—</span>
                          <Input
                            type="number" min="0" step="100"
                            placeholder="∞"
                            value={editForm.range_max}
                            onChange={(e) => setEditForm((f) => f ? { ...f, range_max: e.target.value } : f)}
                            className="w-24 h-7 text-xs font-mono"
                          />
                        </div>
                      ) : (
                        <span className="font-mono font-medium">{rangeLabel(b)}</span>
                      )}
                    </td>

                    {/* Owner pct (read-only — fixed scheme across properties) */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-lg font-bold text-emerald-700">{b.owner_pct}%</span>
                    </td>

                    {/* CE pct (read-only — fixed scheme across properties) */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-lg font-bold text-[#2D6A9F]">{b.ce_pct}%</span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3">
                      {isEditing && editForm ? (
                        <Input
                          placeholder="Descripción del tramo"
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => f ? { ...f, description: e.target.value } : f)}
                          className="h-7 text-xs w-48"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">{b.description ?? "—"}</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="sm" onClick={requestSave} className="h-7 px-2.5 text-xs gap-1">
                            <Save size={11} />Guardar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 px-2 text-xs text-muted-foreground">
                            <X size={11} />
                          </Button>
                        </div>
                      ) : canEdit ? (
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => startEdit(b)}
                          className="h-7 px-2.5 text-xs gap-1 text-muted-foreground hover:text-[#2D6A9F]"
                        >
                          <Pencil size={11} />Editar
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Info note */}
      <div className="rounded-xl border border-[#2D6A9F]/20 bg-[#2D6A9F]/5 px-4 py-3 flex items-start gap-3">
        <Target size={15} className="text-[#2D6A9F] shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          El bracket aplica a la <strong>propiedad activa</strong>. Cambiar de propiedad (arriba) muestra y edita su bracket de forma independiente —
          un cambio en una propiedad no afecta a las demás. Los porcentajes (80 → 70) son iguales para todas; solo cambian los rangos en $.
        </p>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={(v) => { if (!v) setConfirmOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <ShieldAlert size={18} className="text-amber-500" />
              Confirmar cambios al bracket
            </DialogTitle>
            <DialogDescription>
              Revisa los cambios antes de guardar. Esta acción actualizará el bracket y afectará todos los cálculos futuros.
            </DialogDescription>
          </DialogHeader>

          {confirmChanges.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No hay cambios para guardar.</p>
          ) : (
            <div className="rounded-lg border divide-y text-sm">
              {confirmChanges.map((c) => (
                <div key={c.label} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-32 shrink-0 text-muted-foreground text-xs font-medium uppercase tracking-wide">{c.label}</span>
                  <span className="line-through text-muted-foreground/70 tabular-nums">{c.before}</span>
                  <span className="text-foreground font-medium tabular-nums">→ {c.after}</span>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={updateBracket.isPending}>Cancelar</Button>
            <Button onClick={confirmSave} disabled={updateBracket.isPending || confirmChanges.length === 0}>
              {updateBracket.isPending ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Guardando…</> : "Confirmar y guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset-to-template confirmation */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <ShieldAlert size={18} className="text-amber-500" />
              Restablecer a plantilla
            </DialogTitle>
            <DialogDescription>
              Se eliminarán los rangos personalizados de <strong>{selectedProperty?.name}</strong> y la propiedad volverá a usar la
              plantilla por defecto (techo $2,000). Las reservas ya registradas no cambian.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetToTemplate.isPending}>Cancelar</Button>
            <Button onClick={handleReset} disabled={resetToTemplate.isPending}>
              {resetToTemplate.isPending ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Restableciendo…</> : "Restablecer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Access log helpers ────────────────────────────────────────────────────────
const ACTION_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  login:      { label: "Inicio de sesión", icon: LogIn,   cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  logout:     { label: "Cierre de sesión", icon: LogOut,  cls: "bg-amber-100 text-amber-800 border-amber-200"       },
  page_visit: { label: "Visita",           icon: Monitor, cls: "bg-blue-100 text-blue-800 border-blue-200"          },
};

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META[action] ?? { label: action, icon: Monitor, cls: "bg-muted text-foreground border-border" };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${meta.cls}`}>
      <Icon size={9} />{meta.label}
    </span>
  );
}

// ── Accesos tab ───────────────────────────────────────────────────────────────
function AccesosTab() {
  const { data: properties = [] } = useProperties();
  const { data: guestUsers = [], isLoading, refetch } = useGuestUsers();
  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs, error: logsError } = useAccessLogs();
  const unlinkMutation = useUnlinkGuestProperty();

  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [propId,  setPropId]  = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<{ userId: string; propId: string; email: string } | null>(null);

  // Log filters
  const [filterEmail,  setFilterEmail]  = useState("__all__");
  const [filterAction, setFilterAction] = useState("__all__");

  const distinctEmails = useMemo(() => {
    const set = new Set(logs.map((l) => l.user_email));
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs: AccessLog[] = useMemo(() => {
    return logs.filter((l) => {
      if (filterEmail  !== "__all__" && l.user_email !== filterEmail)  return false;
      if (filterAction !== "__all__" && l.action     !== filterAction) return false;
      return true;
    });
  }, [logs, filterEmail, filterAction]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-guest", {
        body: { email, password: pass, property_id: propId || null },
      });
      if (error || data?.error) {
        setResult({ ok: false, msg: error?.message ?? data?.error ?? "Error desconocido" });
      } else {
        setResult({ ok: true, msg: `✓ Usuario "${email}" creado con éxito.` });
        setEmail(""); setPass(""); setPropId("");
        refetch();
      }
    } catch (err) {
      setResult({ ok: false, msg: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function confirmUnlink() {
    if (!unlinkTarget) return;
    await unlinkMutation.mutateAsync(unlinkTarget.propId);
    setUnlinkTarget(null);
  }

  return (
    <div className="space-y-6">
      {/* ── Creation form ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center gap-1.5 font-medium text-foreground">
            <UserPlus size={14} /> Crear nuevo acceso de propietario
          </CardDescription>
          <p className="text-xs text-muted-foreground">
            El propietario podrá iniciar sesión y ver sus reservas en modo solo lectura.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="g-email">Email del propietario</Label>
                <Input id="g-email" type="email" placeholder="propietario@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-pass">Contraseña temporal</Label>
                <Input id="g-pass" type="text" placeholder="Mínimo 8 caracteres" value={pass} onChange={(e) => setPass(e.target.value)} required minLength={8} autoComplete="off" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="g-prop">Propiedad a asignar</Label>
              <Select id="g-prop" value={propId} onChange={(e) => setPropId(e.target.value)} className="w-full sm:w-80">
                <option value="">— Sin asignar por ahora —</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.owner_name})</option>
                ))}
              </Select>
            </div>
            {result && (
              <div className={`text-sm px-3 py-2 rounded-md border ${result.ok ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                {result.msg}
              </div>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 size={14} className="mr-2 animate-spin" />Creando…</> : <><UserPlus size={14} className="mr-2" />Crear acceso</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── User list ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
            Propietarios con acceso ({guestUsers.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-muted-foreground">
            <RefreshCw size={13} className="mr-1" />Actualizar
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2].map((i) => <Card key={i} className="animate-pulse h-16" />)}</div>
        ) : guestUsers.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Users size={28} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Aún no hay propietarios con acceso.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {guestUsers.map((u) => (
              <Card key={u.id} className="border-dashed">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">{u.email.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{u.email}</p>
                        <Badge variant="secondary" className="text-[10px] shrink-0">Solo lectura</Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {u.property_name
                          ? <><Home size={11} className="text-emerald-600 shrink-0" /><span className="text-xs text-emerald-700">{u.property_name}</span></>
                          : <><Home size={11} className="text-muted-foreground shrink-0" /><span className="text-xs text-muted-foreground italic">Sin propiedad asignada</span></>
                        }
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {u.property_name && u.property_id && (
                        <Button variant="ghost" size="sm" onClick={() => setUnlinkTarget({ userId: u.id, propId: u.property_id!, email: u.email })} className="text-muted-foreground hover:text-destructive h-8 text-xs">
                          <Unlink size={12} className="mr-1" />Desasignar
                        </Button>
                      )}
                      {!u.property_id && (
                        <Select className="h-8 text-xs w-44" defaultValue="" onChange={async (e) => {
                          if (!e.target.value) return;
                          const { error } = await supabase.from("properties").update({ owner_profile_id: u.id } as never).eq("id", e.target.value);
                          if (!error) refetch();
                        }}>
                          <option value="">Asignar propiedad…</option>
                          {properties.filter((p) => !p.owner_profile_id).map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </Select>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Access log ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Monitor size={13} />
            Historial de actividad ({filteredLogs.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={() => refetchLogs()} className="text-muted-foreground">
            <RefreshCw size={13} className="mr-1" />Actualizar
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Select
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            className="h-8 text-xs w-52"
          >
            <option value="__all__">Todos los usuarios</option>
            {distinctEmails.map((em) => (
              <option key={em} value={em}>{em}</option>
            ))}
          </Select>
          <Select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="h-8 text-xs w-44"
          >
            <option value="__all__">Todas las acciones</option>
            <option value="login">Inicio de sesión</option>
            <option value="logout">Cierre de sesión</option>
            <option value="page_visit">Visitas</option>
          </Select>
        </div>

        {logsError ? (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertTriangle size={24} className="mx-auto text-amber-500 mb-2" />
              <p className="text-sm text-muted-foreground">La tabla de historial aún no existe en la base de datos.</p>
              <p className="text-xs text-muted-foreground mt-1">Ejecuta la migración <code className="bg-muted px-1 rounded">20260510_access_logs.sql</code> en Supabase.</p>
            </CardContent>
          </Card>
        ) : logsLoading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <Card key={i} className="animate-pulse h-12" />)}</div>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Monitor size={28} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {logs.length === 0 ? "No hay registros de actividad aún." : "Ningún registro coincide con el filtro."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 border-b">
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Fecha y hora</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Usuario</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rol</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Acción</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Página</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, i) => (
                  <tr key={log.id} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {fmtDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium max-w-[180px] truncate">
                      {log.user_email}
                    </td>
                    <td className="px-4 py-2.5">
                      {log.user_role === "admin" ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0F2B4C]/10 text-[#0F2B4C] font-semibold">Admin</span>
                      ) : log.user_role === "guest" ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Propietario</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                      {log.page ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unlink dialog */}
      <Dialog open={!!unlinkTarget} onOpenChange={() => setUnlinkTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Unlink size={16} className="text-destructive" />Desasignar propiedad</DialogTitle>
            <DialogDescription>
              ¿Quitar acceso a la propiedad de <strong>{unlinkTarget?.email}</strong>? El usuario seguirá existiendo pero no verá ninguna propiedad.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmUnlink} disabled={unlinkMutation.isPending}>
              {unlinkMutation.isPending ? "Desasignando…" : "Desasignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminConfiguracion() {
  const [activeTab, setActiveTab] = useState<Tab>("propiedades");
  const current = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
    <div className="max-w-screen-2xl mx-auto animate-fade-in text-sm">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-semibold text-[#0F2B4C]">Configuración</h1>
        <p className="text-muted-foreground mt-0.5">Administra propiedades, plataformas, brackets y accesos desde un solo lugar</p>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                active
                  ? "bg-[#0F2B4C] text-white border-[#0F2B4C] shadow-sm"
                  : "border-border text-muted-foreground hover:border-[#2D6A9F]/40 hover:text-[#2D6A9F] hover:bg-[#2D6A9F]/5"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab description */}
      <p className="text-xs text-muted-foreground mb-5 flex items-center gap-1.5">
        <Settings2 size={12} />
        {current.desc}
      </p>

      {/* Tab content */}
      {activeTab === "propiedades" && <PropiedadesTab />}
      {activeTab === "plataformas" && <PlataformasTab />}
      {activeTab === "brackets"    && <BracketsTab />}
      {activeTab === "accesos"     && <AccesosTab />}
    </div>
    </div>
  );
}
