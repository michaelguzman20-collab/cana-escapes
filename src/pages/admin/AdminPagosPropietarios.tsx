import { useState, useMemo, useEffect } from "react";
import {
  Banknote, ChevronLeft, ChevronRight, CalendarDays,
  CheckCircle2, AlertTriangle, Clock, Download, Plus, Edit3, Trash2,
  Building2, Phone, Mail, Hash, FileText, Printer, Users, Wallet, TrendingDown, TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useOwners } from "@/hooks/useOwners";
import { useProperties } from "@/hooks/useProperties";
import { useProperty } from "@/contexts/PropertyContext";
import { useAllReservationsGlobal } from "@/hooks/useReservations";
import { useCharges } from "@/hooks/useCharges";
import {
  useOwnerPayments, useCreateOwnerPayment,
  useUpdateOwnerPayment, useDeleteOwnerPayment,
} from "@/hooks/useOwnerPayments";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Owner, OwnerPayment, Reservation, Charge, Property } from "@/types/database";

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const PAYMENT_METHODS = ["Transferencia", "Cheque", "Efectivo", "Otro"] as const;

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}
function fmtRd(n: number) {
  return `RD$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}

interface OwnerStatement {
  owner: Owner;
  properties: Property[];
  reservationsCount: number;
  totalNights: number;
  incomeUsd: number;
  incomeRd: number;
  incomeUsdEquiv: number; // RD$ converted to USD using each reservation's exchange_rate
  pendingIncomeUsd: number;
  pendingIncomeRd: number;
  pendingIncomeUsdEquiv: number;
  pendingResCount: number;
  chargesUsd: number;
  chargesRd: number;
  chargesUsdEquiv: number;
  netUsd: number;
  netRd: number;
  netUsdEquiv: number; // total in USD equivalent (matches AdminPropietarios)
  reservations: Reservation[];
  pendingReservations: Reservation[];
  charges: Charge[];
  paidUsd: number;
  paidRd: number;
  transferCostUsd: number;
  transferCostRd: number;
  settledUsd: number; // paidUsd + transferCostUsd (what's been covered)
  settledRd: number;
  payments: OwnerPayment[];
  status: "Pagado" | "Pendiente" | "Parcial" | "Sin movimiento";
}

type PayMode = "usd" | "rd" | "split";

// ── Payment Form Dialog ─────────────────────────────────────────────
function PaymentFormDialog({
  open, onOpenChange, editing, owner, defaultMonth, defaultYear,
  defaultNetUsd, defaultNetRd, defaultNetUsdEquiv, defaultExchangeRate,
  onSave, saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: OwnerPayment | null;
  owner: Owner | null;
  defaultMonth: number;
  defaultYear: number;
  defaultNetUsd: number;
  defaultNetRd: number;
  defaultNetUsdEquiv: number;
  defaultExchangeRate: number;
  onSave: (data: any) => void;
  saving: boolean;
}) {
  // Payment mode: "usd" = todo en USD ($520.51), "rd" = todo en RD$, "split" = desglose por moneda
  const [payMode, setPayMode] = useState<PayMode>("usd");

  const [form, setForm] = useState({
    amount_paid_usd: defaultNetUsdEquiv,
    amount_paid_rd: 0,
    transfer_cost_usd: 0,
    transfer_cost_rd: 0,
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "Transferencia",
    reference: "",
    notes: "",
  });

  // Helper to compute defaults per mode
  function defaultsForMode(mode: PayMode) {
    if (mode === "usd") {
      return { amount_paid_usd: Math.max(0, defaultNetUsdEquiv), amount_paid_rd: 0 };
    }
    if (mode === "rd") {
      const totalRd = (defaultNetUsd * defaultExchangeRate) + defaultNetRd;
      return { amount_paid_usd: 0, amount_paid_rd: Math.max(0, totalRd) };
    }
    // split
    return {
      amount_paid_usd: Math.max(0, defaultNetUsd),
      amount_paid_rd: Math.max(0, defaultNetRd),
    };
  }

  // Re-initialize when opening or editing changes
  useEffect(() => {
    if (open) {
      const editTransUsd = editing?.transfer_cost_usd ?? 0;
      const editTransRd = editing?.transfer_cost_rd ?? 0;
      // Default mode is "usd" (full USD equivalent — consolidated like Propietarios)
      // For editing: detect mode based on existing values
      let initialMode: PayMode = "usd";
      if (editing) {
        if (editing.amount_paid_usd > 0 && editing.amount_paid_rd > 0) initialMode = "split";
        else if (editing.amount_paid_rd > 0 && editing.amount_paid_usd === 0) initialMode = "rd";
        else initialMode = "usd";
      }
      setPayMode(initialMode);

      const defaults = editing
        ? { amount_paid_usd: editing.amount_paid_usd, amount_paid_rd: editing.amount_paid_rd }
        : defaultsForMode(initialMode);

      setForm({
        ...defaults,
        transfer_cost_usd: editTransUsd,
        transfer_cost_rd: editTransRd,
        payment_date: editing?.payment_date ?? new Date().toISOString().slice(0, 10),
        payment_method: editing?.payment_method ?? "Transferencia",
        reference: editing?.reference ?? "",
        notes: editing?.notes ?? "",
      });
    }
  }, [open, editing?.id, defaultNetUsd, defaultNetRd, defaultNetUsdEquiv]);

  // When user changes mode, update amounts to match the new mode's defaults
  function handleModeChange(mode: PayMode) {
    setPayMode(mode);
    const defaults = defaultsForMode(mode);
    setForm((f) => ({
      ...f,
      ...defaults,
      // Reset transfer cost when switching modes (keeps it cleaner)
      transfer_cost_usd: mode === "rd" ? 0 : f.transfer_cost_usd,
      transfer_cost_rd: mode === "usd" ? 0 : f.transfer_cost_rd,
    }));
  }

  // Base nets used for percentage calculations and amount derivation
  const baseUsdForCost = payMode === "usd" ? defaultNetUsdEquiv : defaultNetUsd;
  const baseRdForCost = payMode === "rd"
    ? (defaultNetUsd * defaultExchangeRate) + defaultNetRd
    : defaultNetRd;

  // When transfer cost changes (typed as amount), auto-adjust the amount sent (deduct from net)
  function handleTransferCostUsdChange(cost: number) {
    setForm((f) => ({
      ...f,
      transfer_cost_usd: cost,
      amount_paid_usd: Math.max(0, baseUsdForCost - cost),
    }));
  }
  function handleTransferCostRdChange(cost: number) {
    setForm((f) => ({
      ...f,
      transfer_cost_rd: cost,
      amount_paid_rd: Math.max(0, baseRdForCost - cost),
    }));
  }

  // When user types a percentage, compute the cost amount and update both
  function handleTransferCostUsdPctChange(pct: number) {
    const cost = +(baseUsdForCost * pct / 100).toFixed(2);
    handleTransferCostUsdChange(cost);
  }
  function handleTransferCostRdPctChange(pct: number) {
    const cost = +(baseRdForCost * pct / 100).toFixed(2);
    handleTransferCostRdChange(cost);
  }

  // Compute current percentages (for display)
  const transferCostUsdPct = baseUsdForCost > 0 ? (form.transfer_cost_usd / baseUsdForCost) * 100 : 0;
  const transferCostRdPct = baseRdForCost > 0 ? (form.transfer_cost_rd / baseRdForCost) * 100 : 0;

  // Color hint based on percentage (typical wire transfer 5-15%)
  function pctHintColor(pct: number) {
    if (pct === 0) return "text-muted-foreground";
    if (pct < 1) return "text-blue-600";
    if (pct <= 3) return "text-emerald-600";
    if (pct <= 15) return "text-emerald-700";
    if (pct <= 20) return "text-amber-600";
    return "text-red-600";
  }
  function pctHintLabel(pct: number) {
    if (pct === 0) return "";
    if (pct < 1) return "Muy bajo";
    if (pct <= 3) return "Bajo";
    if (pct <= 7) return "Normal";
    if (pct <= 15) return "Wire típico";
    if (pct <= 20) return "Alto";
    return "Muy alto — verifica";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!owner) return;
    onSave({
      ...form,
      owner_id: owner.id,
      period_month: editing?.period_month ?? defaultMonth,
      period_year: editing?.period_year ?? defaultYear,
      reference: form.reference || null,
      notes: form.notes || null,
    });
  }

  const totalSettledUsd = form.amount_paid_usd + form.transfer_cost_usd;
  const totalSettledRd = form.amount_paid_rd + form.transfer_cost_rd;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote size={18} className="text-emerald-600" />
            {editing ? "Editar pago" : "Registrar pago"}
          </DialogTitle>
          <DialogDescription>
            {owner?.full_name} — {MONTHS_ES[(editing?.period_month ?? defaultMonth) - 1]} {editing?.period_year ?? defaultYear}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Net to pay summary */}
          <div className="border rounded-lg p-3 bg-slate-50 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Neto a pagar</span>
              <span className="font-bold text-[#0F2B4C] text-base">{fmtUsd(defaultNetUsdEquiv)}</span>
            </div>
            {(defaultNetUsd > 0.01 || defaultNetRd > 0.01) && (defaultNetUsd > 0.01 && defaultNetRd > 0.01) && (
              <p className="text-[10px] text-muted-foreground">
                Desglose: {defaultNetUsd > 0.01 && fmtUsd(defaultNetUsd)}
                {defaultNetUsd > 0.01 && defaultNetRd > 0.01 && " + "}
                {defaultNetRd > 0.01 && fmtRd(defaultNetRd)}
              </p>
            )}
          </div>

          {/* Payment mode selector */}
          <div>
            <Label className="text-xs mb-1.5 block">Modalidad de pago</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "usd" as PayMode, label: "Todo en USD", sub: fmtUsd(defaultNetUsdEquiv) },
                { id: "rd" as PayMode, label: "Todo en RD$", sub: fmtRd((defaultNetUsd * defaultExchangeRate) + defaultNetRd) },
                { id: "split" as PayMode, label: "Por moneda", sub: defaultNetUsd > 0 && defaultNetRd > 0 ? "USD + RD$" : (defaultNetUsd > 0 ? "Solo USD" : "Solo RD$") },
              ]).map(({ id, label, sub }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleModeChange(id)}
                  className={cn(
                    "rounded-lg border p-2 text-left transition-all",
                    payMode === id
                      ? "border-[#2D6A9F] bg-[#2D6A9F]/5 ring-1 ring-[#2D6A9F]"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <p className={cn("text-[11px] font-semibold", payMode === id ? "text-[#2D6A9F]" : "text-[#0F2B4C]")}>
                    {label}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{sub}</p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Tasa promedio del mes: <span className="font-semibold text-emerald-700">RD${defaultExchangeRate.toFixed(2)} / USD</span>
              <span className="ml-1 text-[9px] italic">(ponderada por monto bruto)</span>
            </p>
          </div>

          {/* Transfer cost — dual input (Monto + Porcentaje) */}
          {payMode !== "rd" && (
            <div className={cn("space-y-3", payMode === "split" && "sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3")}>
              {/* USD cost block */}
              <div className="rounded-lg border bg-slate-50/50 p-3">
                <Label className="text-xs font-semibold text-[#0F2B4C] block mb-2">Costo transferencia USD</Label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Monto $</label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={form.transfer_cost_usd || ""}
                      onChange={(e) => handleTransferCostUsdChange(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="text-muted-foreground text-xs pt-4">o</div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Porcentaje %</label>
                    <Input
                      type="number" step="0.1" min="0" max="100"
                      value={transferCostUsdPct > 0 ? transferCostUsdPct.toFixed(2) : ""}
                      onChange={(e) => handleTransferCostUsdPctChange(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px]">
                  <span className="text-muted-foreground italic">Asumido por el propietario</span>
                  {transferCostUsdPct > 0 && (
                    <span className={cn("font-semibold", pctHintColor(transferCostUsdPct))}>
                      {transferCostUsdPct.toFixed(2)}% · {pctHintLabel(transferCostUsdPct)}
                    </span>
                  )}
                </div>
              </div>

              {/* RD$ cost block (only in split mode) */}
              {payMode === "split" && (
                <div className="rounded-lg border bg-slate-50/50 p-3">
                  <Label className="text-xs font-semibold text-[#0F2B4C] block mb-2">Costo transferencia RD$</Label>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Monto RD$</label>
                      <Input
                        type="number" step="0.01" min="0"
                        value={form.transfer_cost_rd || ""}
                        onChange={(e) => handleTransferCostRdChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="text-muted-foreground text-xs pt-4">o</div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Porcentaje %</label>
                      <Input
                        type="number" step="0.1" min="0" max="100"
                        value={transferCostRdPct > 0 ? transferCostRdPct.toFixed(2) : ""}
                        onChange={(e) => handleTransferCostRdPctChange(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[10px]">
                    <span className="text-muted-foreground italic">Asumido por el propietario</span>
                    {transferCostRdPct > 0 && (
                      <span className={cn("font-semibold", pctHintColor(transferCostRdPct))}>
                        {transferCostRdPct.toFixed(2)}% · {pctHintLabel(transferCostRdPct)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {payMode === "rd" && (
            <div className="rounded-lg border bg-slate-50/50 p-3">
              <Label className="text-xs font-semibold text-[#0F2B4C] block mb-2">Costo transferencia RD$</Label>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-0.5">Monto RD$</label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={form.transfer_cost_rd || ""}
                    onChange={(e) => handleTransferCostRdChange(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="text-muted-foreground text-xs pt-4">o</div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-0.5">Porcentaje %</label>
                  <Input
                    type="number" step="0.1" min="0" max="100"
                    value={transferCostRdPct > 0 ? transferCostRdPct.toFixed(2) : ""}
                    onChange={(e) => handleTransferCostRdPctChange(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[10px]">
                <span className="text-muted-foreground italic">Asumido por el propietario</span>
                {transferCostRdPct > 0 && (
                  <span className={cn("font-semibold", pctHintColor(transferCostRdPct))}>
                    {transferCostRdPct.toFixed(2)}% · {pctHintLabel(transferCostRdPct)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Amount to transfer — conditional by mode */}
          {payMode === "usd" && (
            <div>
              <Label className="text-xs">Monto a transferir USD</Label>
              <Input
                type="number" step="0.01" min="0"
                value={form.amount_paid_usd}
                onChange={(e) => setForm({ ...form, amount_paid_usd: parseFloat(e.target.value) || 0 })}
                className="font-semibold text-base"
              />
              <p className="text-[10px] text-emerald-700 mt-1 font-medium">
                Total saldado: {fmtUsd(totalSettledUsd)}
                {Math.abs(totalSettledUsd - defaultNetUsdEquiv) > 0.01 && (
                  <span className="text-amber-700"> (Δ {fmtUsd(totalSettledUsd - defaultNetUsdEquiv)})</span>
                )}
              </p>
            </div>
          )}
          {payMode === "rd" && (
            <div>
              <Label className="text-xs">Monto a transferir RD$</Label>
              <Input
                type="number" step="0.01" min="0"
                value={form.amount_paid_rd}
                onChange={(e) => setForm({ ...form, amount_paid_rd: parseFloat(e.target.value) || 0 })}
                className="font-semibold text-base"
              />
              <p className="text-[10px] text-emerald-700 mt-1 font-medium">
                Total saldado: {fmtRd(totalSettledRd)} (≈ {fmtUsd(totalSettledRd / defaultExchangeRate)})
              </p>
            </div>
          )}
          {payMode === "split" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Monto a transferir USD</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={form.amount_paid_usd}
                  onChange={(e) => setForm({ ...form, amount_paid_usd: parseFloat(e.target.value) || 0 })}
                  className="font-semibold"
                />
                <p className="text-[10px] text-emerald-700 mt-1 font-medium">
                  Saldado: {fmtUsd(totalSettledUsd)}
                  {Math.abs(totalSettledUsd - defaultNetUsd) > 0.01 && (
                    <span className="text-amber-700"> (Δ {fmtUsd(totalSettledUsd - defaultNetUsd)})</span>
                  )}
                </p>
              </div>
              <div>
                <Label className="text-xs">Monto a transferir RD$</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={form.amount_paid_rd}
                  onChange={(e) => setForm({ ...form, amount_paid_rd: parseFloat(e.target.value) || 0 })}
                  className="font-semibold"
                />
                <p className="text-[10px] text-emerald-700 mt-1 font-medium">
                  Saldado: {fmtRd(totalSettledRd)}
                  {Math.abs(totalSettledRd - defaultNetRd) > 0.01 && (
                    <span className="text-amber-700"> (Δ {fmtRd(totalSettledRd - defaultNetRd)})</span>
                  )}
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Fecha del pago</Label>
              <Input
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Método</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              >
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Referencia / # transacción</Label>
            <Input
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="Ej: TRF-20260520-001"
            />
          </div>
          <div>
            <Label>Notas</Label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm bg-background min-h-[60px] resize-y"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Observaciones..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : editing ? "Actualizar" : "Registrar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Statement Detail Dialog ─────────────────────────────────────────
function StatementDetailDialog({
  open, onOpenChange, statement, periodLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  statement: OwnerStatement | null;
  periodLabel: string;
}) {
  if (!statement) return null;
  const { owner, properties, reservations, charges, incomeUsd, incomeRd, chargesUsd, chargesRd, netUsd, netRd, paidUsd, paidRd, transferCostUsd, transferCostRd, settledUsd, settledRd, payments } = statement;

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-none print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} className="text-[#2D6A9F]" />
            Estado de cuenta — {owner.full_name}
          </DialogTitle>
          <DialogDescription>{periodLabel}</DialogDescription>
        </DialogHeader>

        <div id="statement-print" className="space-y-4 print:p-8">
          {/* Header */}
          <div className="border-b-2 border-[#0F2B4C] pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-bold text-[#0F2B4C]">ESTADO DE CUENTA</h2>
                <p className="text-sm text-muted-foreground">{periodLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[#0F2B4C]">Cana Escapes</p>
                <p className="text-[10px] text-muted-foreground">RNC 133-70382-3</p>
              </div>
            </div>
          </div>

          {/* Owner info */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Propietario</p>
              <p className="font-semibold text-sm">{owner.full_name}</p>
              {owner.co_owner_name && <p className="text-muted-foreground">y {owner.co_owner_name}</p>}
              {owner.email && <p className="flex items-center gap-1 text-muted-foreground mt-0.5"><Mail size={10} />{owner.email}</p>}
              {owner.phone && <p className="flex items-center gap-1 text-muted-foreground"><Phone size={10} />{owner.phone}</p>}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Cuenta bancaria</p>
              <p className="font-semibold">{owner.bank_name ?? "—"}</p>
              <p className="text-muted-foreground">{owner.bank_account ?? "Sin cuenta registrada"}</p>
              {owner.bank_account_type && <p className="text-muted-foreground">{owner.bank_account_type}</p>}
            </div>
          </div>

          {/* Properties */}
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Propiedades</p>
            <div className="flex flex-wrap gap-1.5">
              {properties.map((p) => (
                <Badge key={p.id} variant="outline" className="text-[11px] gap-1">
                  <Building2 size={10} /> {p.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Income */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-emerald-50 border-b">
              <p className="font-bold text-sm text-emerald-800">Ingresos de reservas</p>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-3 py-1.5">Check-in</th>
                  <th className="text-left px-3 py-1.5">Huésped</th>
                  <th className="text-left px-3 py-1.5">Plataforma</th>
                  <th className="text-right px-3 py-1.5">Noches</th>
                  <th className="text-right px-3 py-1.5">Bruto</th>
                  <th className="text-right px-3 py-1.5">Propietario</th>
                </tr>
              </thead>
              <tbody>
                {reservations.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-3 text-center text-muted-foreground italic">Sin reservas</td></tr>
                ) : (
                  reservations.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-1.5">{fmtDate(r.checkin)}</td>
                      <td className="px-3 py-1.5">{r.guest_name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.platform}</td>
                      <td className="px-3 py-1.5 text-right">{r.nights}</td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">
                        {r.currency === "USD" ? fmtUsd(r.gross_amount) : fmtRd(r.gross_amount)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-emerald-700">
                        {r.currency === "USD" ? fmtUsd(r.owner_amount) : fmtRd(r.owner_amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {reservations.length > 0 && (
                <tfoot className="bg-emerald-50/60 border-t-2 font-bold">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right">TOTAL INGRESOS</td>
                    <td className="px-3 py-2 text-right text-emerald-700">
                      {incomeUsd > 0 && <div>{fmtUsd(incomeUsd)}</div>}
                      {incomeRd > 0 && <div>{fmtRd(incomeRd)}</div>}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Charges */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-red-50 border-b">
              <p className="font-bold text-sm text-red-800">Cargos al propietario</p>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-3 py-1.5">Fecha</th>
                  <th className="text-left px-3 py-1.5">Concepto</th>
                  <th className="text-left px-3 py-1.5">Categoría</th>
                  <th className="text-right px-3 py-1.5">Monto</th>
                </tr>
              </thead>
              <tbody>
                {charges.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-3 text-center text-muted-foreground italic">Sin cargos</td></tr>
                ) : (
                  charges.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-1.5">{fmtDate(c.date)}</td>
                      <td className="px-3 py-1.5">{c.description}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{c.category}</td>
                      <td className="px-3 py-1.5 text-right font-semibold text-red-700">
                        {c.currency === "USD" || c.currency === "$" ? fmtUsd(c.amount) : fmtRd(c.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {charges.length > 0 && (
                <tfoot className="bg-red-50/60 border-t-2 font-bold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right">TOTAL CARGOS</td>
                    <td className="px-3 py-2 text-right text-red-700">
                      {chargesUsd > 0 && <div>{fmtUsd(chargesUsd)}</div>}
                      {chargesRd > 0 && <div>{fmtRd(chargesRd)}</div>}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Net */}
          <div className="border-2 border-[#0F2B4C] rounded-lg p-3 bg-[#0F2B4C]/[0.03]">
            <div className="grid grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-[11px] font-bold uppercase text-muted-foreground">Ingresos</p>
                <p className="text-emerald-700 font-semibold">
                  {incomeUsd > 0 && <span className="block">{fmtUsd(incomeUsd)}</span>}
                  {incomeRd > 0 && <span className="block">{fmtRd(incomeRd)}</span>}
                  {incomeUsd === 0 && incomeRd === 0 && <span>—</span>}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-muted-foreground">− Cargos</p>
                <p className="text-red-700 font-semibold">
                  {chargesUsd > 0 && <span className="block">{fmtUsd(chargesUsd)}</span>}
                  {chargesRd > 0 && <span className="block">{fmtRd(chargesRd)}</span>}
                  {chargesUsd === 0 && chargesRd === 0 && <span>—</span>}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-muted-foreground">− Costo transf.</p>
                <p className="text-amber-700 font-semibold">
                  {transferCostUsd > 0 && <span className="block">{fmtUsd(transferCostUsd)}</span>}
                  {transferCostRd > 0 && <span className="block">{fmtRd(transferCostRd)}</span>}
                  {transferCostUsd === 0 && transferCostRd === 0 && <span>—</span>}
                </p>
              </div>
              <div className="border-l-2 border-[#0F2B4C] pl-3">
                <p className="text-[10px] font-bold uppercase text-[#0F2B4C]">= Recibido</p>
                <p className="text-[#0F2B4C] font-bold text-base">
                  {paidUsd > 0 && <span className="block">{fmtUsd(paidUsd)}</span>}
                  {paidRd > 0 && <span className="block">{fmtRd(paidRd)}</span>}
                  {paidUsd === 0 && paidRd === 0 && (
                    <span className="text-sm text-muted-foreground">Pendiente</span>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#0F2B4C]/20 text-[10px] text-muted-foreground italic">
              El costo de transferencia es asumido por el propietario y se deduce del neto a pagar.
            </div>
          </div>

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-blue-50 border-b">
                <p className="font-bold text-sm text-blue-800">Pagos registrados</p>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left px-3 py-1.5">Fecha</th>
                    <th className="text-left px-3 py-1.5">Método</th>
                    <th className="text-left px-3 py-1.5">Referencia</th>
                    <th className="text-right px-3 py-1.5">Transferido</th>
                    <th className="text-right px-3 py-1.5">Costo transf.</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-1.5">{fmtDate(p.payment_date)}</td>
                      <td className="px-3 py-1.5">{p.payment_method}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{p.reference ?? "—"}</td>
                      <td className="px-3 py-1.5 text-right font-semibold text-blue-700">
                        {p.amount_paid_usd > 0 && <div>{fmtUsd(p.amount_paid_usd)}</div>}
                        {p.amount_paid_rd > 0 && <div>{fmtRd(p.amount_paid_rd)}</div>}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-amber-700">
                        {(p.transfer_cost_usd ?? 0) > 0 && <div>{fmtUsd(p.transfer_cost_usd)}</div>}
                        {(p.transfer_cost_rd ?? 0) > 0 && <div>{fmtRd(p.transfer_cost_rd)}</div>}
                        {(!p.transfer_cost_usd || p.transfer_cost_usd === 0) && (!p.transfer_cost_rd || p.transfer_cost_rd === 0) && (
                          <span className="text-muted-foreground font-normal">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-50/60 border-t-2 font-bold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right">TOTALES</td>
                    <td className="px-3 py-2 text-right text-blue-700">
                      {paidUsd > 0 && <div>{fmtUsd(paidUsd)}</div>}
                      {paidRd > 0 && <div>{fmtRd(paidRd)}</div>}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-700">
                      {transferCostUsd > 0 && <div>{fmtUsd(transferCostUsd)}</div>}
                      {transferCostRd > 0 && <div>{fmtRd(transferCostRd)}</div>}
                      {transferCostUsd === 0 && transferCostRd === 0 && <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Balance */}
          {(netUsd > 0 || netRd > 0 || settledUsd > 0 || settledRd > 0) && (
            <div className={cn(
              "border-2 rounded-lg p-3",
              netUsd - settledUsd <= 0.01 && netRd - settledRd <= 0.01
                ? "border-emerald-500 bg-emerald-50"
                : "border-amber-500 bg-amber-50",
            )}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase">
                  Saldo pendiente
                </p>
                <div className="text-right font-bold">
                  {Math.max(0, netUsd - settledUsd) > 0.01 && <div className="text-amber-700">{fmtUsd(Math.max(0, netUsd - settledUsd))}</div>}
                  {Math.max(0, netRd - settledRd) > 0.01 && <div className="text-amber-700">{fmtRd(Math.max(0, netRd - settledRd))}</div>}
                  {Math.max(0, netUsd - settledUsd) <= 0.01 && Math.max(0, netRd - settledRd) <= 0.01 && (
                    <div className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Saldado
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer size={14} className="mr-1.5" /> Imprimir / PDF
          </Button>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──────────────────────────────────────────────
export function AdminPagosPropietarios() {
  const { data: owners = [] } = useOwners();
  const { data: properties = [] } = useProperties();
  const { selectedPropertyId } = useProperty();
  const { data: allReservations = [] } = useAllReservationsGlobal();
  const { data: ownerCharges = [] } = useCharges("propietario");
  const { data: payments = [] } = useOwnerPayments();

  const createPayment = useCreateOwnerPayment();
  const updatePayment = useUpdateOwnerPayment();
  const deletePayment = useDeleteOwnerPayment();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<OwnerPayment | null>(null);
  const [formOwner, setFormOwner] = useState<Owner | null>(null);
  const [formNetUsd, setFormNetUsd] = useState(0);
  const [formNetRd, setFormNetRd] = useState(0);
  const [formNetUsdEquiv, setFormNetUsdEquiv] = useState(0);
  const [formExchangeRate, setFormExchangeRate] = useState(60);
  const [deleteTarget, setDeleteTarget] = useState<OwnerPayment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStatement, setDetailStatement] = useState<OwnerStatement | null>(null);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  function goToToday() {
    const t = new Date();
    setMonth(t.getMonth() + 1);
    setYear(t.getFullYear());
  }

  // Find the owner of the selected property (for property-level sync)
  const activePropertyOwnerId = useMemo(() => {
    if (!selectedPropertyId) return null;
    const prop = properties.find((p) => p.id === selectedPropertyId);
    return prop?.owner_id ?? null;
  }, [selectedPropertyId, properties]);

  // Build statement per owner
  const statements: OwnerStatement[] = useMemo(() => {
    return owners
      .filter((o) => o.active)
      .filter((o) => !activePropertyOwnerId || o.id === activePropertyOwnerId)
      .map((owner) => {
        // Properties for this owner
        const ownerProps = properties.filter((p) => p.owner_id === owner.id);
        const propIds = ownerProps.map((p) => p.id);

        // Reservations for this owner in the period — only Completada count
        // (matches AdminPropietarios logic — only confirmed/closed reservations)
        const ownerRes = allReservations.filter((r: Reservation) =>
          propIds.includes(r.property_id)
          && r.period_month === month
          && r.period_year === year
          && (r.status === "Completada" || r.status === "Confirmada")
        );

        // Pending reservations (not yet paid) — shown for visibility only
        const pendingRes = allReservations.filter((r: Reservation) =>
          propIds.includes(r.property_id)
          && r.period_month === month
          && r.period_year === year
          && (r.status === "Pendiente" || r.status === "Reservado" || r.status === "Confirmada")
        );

        // Charges for this owner in the period — only Aplicado/Pagado count
        // (matches AdminPropietarios — Pendiente charges aren't owed yet)
        const ownerCh = ownerCharges.filter((c: Charge) => {
          if (c.owner_id !== owner.id && !propIds.includes(c.property_id ?? "")) return false;
          if (c.status !== "Aplicado" && c.status !== "Pagado") return false;
          const d = new Date(c.date + "T12:00:00");
          return d.getMonth() + 1 === month && d.getFullYear() === year;
        });

        // Helper: convert reservation amount to USD using its exchange_rate
        const toUsd = (r: Reservation, val: number) =>
          r.currency === "RD$" && r.exchange_rate > 0 ? val / r.exchange_rate : val;

        // Income totals (only Completada)
        let incomeUsd = 0, incomeRd = 0, incomeUsdEquiv = 0, totalNights = 0;
        for (const r of ownerRes) {
          totalNights += r.nights;
          incomeUsdEquiv += toUsd(r, r.owner_amount);
          if (r.currency === "USD") incomeUsd += r.owner_amount;
          else incomeRd += r.owner_amount;
        }

        // Pending income (informational, not in net)
        let pendingIncomeUsd = 0, pendingIncomeRd = 0, pendingIncomeUsdEquiv = 0;
        for (const r of pendingRes) {
          pendingIncomeUsdEquiv += toUsd(r, r.owner_amount);
          if (r.currency === "USD") pendingIncomeUsd += r.owner_amount;
          else pendingIncomeRd += r.owner_amount;
        }

        // Charges totals (using amount_usd for USD equivalent)
        let chargesUsd = 0, chargesRd = 0, chargesUsdEquiv = 0;
        for (const c of ownerCh) {
          chargesUsdEquiv += c.amount_usd;
          if (c.currency === "USD" || c.currency === "$") chargesUsd += c.amount;
          else chargesRd += c.amount;
        }

        // Net (income - charges) — only confirmed/applied
        const netUsd = incomeUsd - chargesUsd;
        const netRd = incomeRd - chargesRd;
        const netUsdEquiv = incomeUsdEquiv - chargesUsdEquiv;

        // Payments for this owner+period
        const ownerPays = payments.filter((p: OwnerPayment) =>
          p.owner_id === owner.id && p.period_month === month && p.period_year === year
        );
        const paidUsd = ownerPays.reduce((s, p) => s + p.amount_paid_usd, 0);
        const paidRd = ownerPays.reduce((s, p) => s + p.amount_paid_rd, 0);
        const transferCostUsd = ownerPays.reduce((s, p) => s + (p.transfer_cost_usd ?? 0), 0);
        const transferCostRd = ownerPays.reduce((s, p) => s + (p.transfer_cost_rd ?? 0), 0);
        const settledUsd = paidUsd + transferCostUsd;
        const settledRd = paidRd + transferCostRd;

        // Weighted average exchange rate from reservations (same as Reservas menu)
        // Weighted by gross_amount so larger RD$ reservations pull the rate more accurately
        const rdRes = ownerRes.filter((r) => r.currency === "RD$" && r.exchange_rate > 0);
        const totalRdGross = rdRes.reduce((s, r) => s + r.gross_amount, 0);
        const avgRate = totalRdGross > 0
          ? rdRes.reduce((s, r) => s + r.gross_amount * r.exchange_rate, 0) / totalRdGross
          : (ownerProps[0]?.reference_rate ?? 60);
        const settledUsdEquiv = settledUsd + (avgRate > 0 ? settledRd / avgRate : 0);

        // Status — based on USD equivalent so it consolidates both currencies
        let status: OwnerStatement["status"] = "Sin movimiento";
        if (netUsdEquiv > 0.01) {
          if (settledUsdEquiv >= netUsdEquiv - 0.5) status = "Pagado";
          else if (settledUsdEquiv > 0) status = "Parcial";
          else status = "Pendiente";
        }

        return {
          owner, properties: ownerProps,
          reservationsCount: ownerRes.length, totalNights,
          incomeUsd, incomeRd, incomeUsdEquiv,
          pendingIncomeUsd, pendingIncomeRd, pendingIncomeUsdEquiv,
          pendingResCount: pendingRes.length,
          chargesUsd, chargesRd, chargesUsdEquiv,
          netUsd, netRd, netUsdEquiv,
          reservations: ownerRes,
          pendingReservations: pendingRes,
          charges: ownerCh,
          paidUsd, paidRd, transferCostUsd, transferCostRd, settledUsd, settledRd,
          payments: ownerPays,
          status,
        };
      })
      .sort((a, b) => b.netUsdEquiv - a.netUsdEquiv);
  }, [owners, properties, allReservations, ownerCharges, payments, month, year, activePropertyOwnerId]);

  // KPIs
  const kpis = useMemo(() => {
    return statements.reduce((acc, s) => ({
      totalOwners: acc.totalOwners + 1,
      withMovement: acc.withMovement + (s.status !== "Sin movimiento" ? 1 : 0),
      pendientes: acc.pendientes + (s.status === "Pendiente" || s.status === "Parcial" ? 1 : 0),
      pagados: acc.pagados + (s.status === "Pagado" ? 1 : 0),
      netUsd: acc.netUsd + s.netUsd,
      netRd: acc.netRd + s.netRd,
      netUsdEquiv: acc.netUsdEquiv + s.netUsdEquiv,
      paidUsd: acc.paidUsd + s.paidUsd,
      paidRd: acc.paidRd + s.paidRd,
      transferCostUsd: acc.transferCostUsd + s.transferCostUsd,
      transferCostRd: acc.transferCostRd + s.transferCostRd,
      settledUsd: acc.settledUsd + s.settledUsd,
      settledRd: acc.settledRd + s.settledRd,
    }), { totalOwners: 0, withMovement: 0, pendientes: 0, pagados: 0, netUsd: 0, netRd: 0, netUsdEquiv: 0, paidUsd: 0, paidRd: 0, transferCostUsd: 0, transferCostRd: 0, settledUsd: 0, settledRd: 0 });
  }, [statements]);

  function handleOpenStatement(s: OwnerStatement) {
    setDetailStatement(s);
    setDetailOpen(true);
  }

  // Compute weighted average exchange rate for the statement
  // (matches AdminReservas formula: weighted by gross amount)
  function statementExchangeRate(s: OwnerStatement): number {
    const rdRes = s.reservations.filter((r) => r.currency === "RD$" && r.exchange_rate > 0);
    if (rdRes.length === 0) {
      // Fall back to property reference rate
      const refRate = s.properties[0]?.reference_rate ?? 60;
      return refRate > 0 ? refRate : 60;
    }
    const totalGross = rdRes.reduce((sum, r) => sum + r.gross_amount, 0);
    return totalGross > 0
      ? rdRes.reduce((sum, r) => sum + r.gross_amount * r.exchange_rate, 0) / totalGross
      : rdRes[0].exchange_rate;
  }

  function handleRegisterPayment(s: OwnerStatement) {
    setFormOwner(s.owner);
    setFormNetUsd(Math.max(0, s.netUsd - s.settledUsd));
    setFormNetRd(Math.max(0, s.netRd - s.settledRd));
    setFormNetUsdEquiv(Math.max(0, s.netUsdEquiv - (s.settledUsd + s.settledRd / statementExchangeRate(s))));
    setFormExchangeRate(statementExchangeRate(s));
    setEditingPayment(null);
    setPaymentFormOpen(true);
  }

  function handleEditPayment(p: OwnerPayment, ownerObj: Owner) {
    setFormOwner(ownerObj);
    // Find matching statement for rate context
    const s = statements.find((st) => st.owner.id === ownerObj.id);
    const rate = s ? statementExchangeRate(s) : 60;
    setFormNetUsd(p.amount_paid_usd);
    setFormNetRd(p.amount_paid_rd);
    setFormNetUsdEquiv(p.amount_paid_usd + (p.amount_paid_rd / rate));
    setFormExchangeRate(rate);
    setEditingPayment(p);
    setPaymentFormOpen(true);
  }

  async function handleSavePayment(data: any) {
    try {
      if (editingPayment) {
        await updatePayment.mutateAsync({ id: editingPayment.id, ...data });
        toast({ title: "Pago actualizado", variant: "success" });
      } else {
        await createPayment.mutateAsync(data);
        toast({ title: "Pago registrado", variant: "success" });
      }
      setPaymentFormOpen(false);
      setEditingPayment(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleDeletePayment() {
    if (!deleteTarget) return;
    try {
      await deletePayment.mutateAsync(deleteTarget.id);
      toast({ title: "Pago eliminado" });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  function downloadCSV() {
    const headers = ["Propietario", "Propiedades", "Reservas", "Noches", "Ingreso USD", "Ingreso RD$", "Cargos USD", "Cargos RD$", "Neto USD", "Neto RD$", "Transferido USD", "Transferido RD$", "Costo transf. USD", "Costo transf. RD$", "Estado"];
    const rows = statements.map((s) => [
      s.owner.full_name,
      s.properties.map((p) => p.name).join(" / "),
      s.reservationsCount, s.totalNights,
      s.incomeUsd.toFixed(2), s.incomeRd.toFixed(2),
      s.chargesUsd.toFixed(2), s.chargesRd.toFixed(2),
      s.netUsd.toFixed(2), s.netRd.toFixed(2),
      s.paidUsd.toFixed(2), s.paidRd.toFixed(2),
      s.transferCostUsd.toFixed(2), s.transferCostRd.toFixed(2),
      s.status,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pagos_propietarios_${year}_${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const periodLabel = `${MONTHS_ES[month - 1]} ${year}`;
  const activeProperty = properties.find((p) => p.id === selectedPropertyId);

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
      <div className="max-w-screen-2xl mx-auto space-y-5 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2B4C] flex items-center gap-2">
            <Banknote size={22} className="text-emerald-600" />
            Pagos a Propietarios
          </h1>
          <p className="text-sm text-muted-foreground">
            Estados de cuenta y registro de pagos mensuales
            {activeProperty && (
              <span className="ml-2 inline-flex items-center gap-1 text-[#2D6A9F] font-medium">
                · <Building2 size={11} /> {activeProperty.name}
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={downloadCSV}>
          <Download size={14} className="mr-1.5" /> Exportar CSV
        </Button>
      </div>

      {/* Month navigator */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
          <button onClick={prevMonth} className="px-3 py-2 hover:bg-slate-50 transition-colors text-[#0F2B4C] border-r border-slate-200">
            <ChevronLeft size={15} />
          </button>
          <div className="px-4 py-2 bg-[#0F2B4C]/[0.03]">
            <span className="text-xs font-bold text-[#0F2B4C] whitespace-nowrap">{periodLabel}</span>
          </div>
          <button onClick={nextMonth} className="px-3 py-2 hover:bg-slate-50 transition-colors text-[#0F2B4C] border-l border-slate-200">
            <ChevronRight size={15} />
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          <CalendarDays size={13} className="mr-1.5" /> Hoy
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {([
          {
            label: "Propietarios", value: String(kpis.totalOwners),
            sub: `${kpis.withMovement} con movimiento`,
            Icon: Users, topCls: "bg-[#0F2B4C]", valCls: "text-[#0F2B4C]",
          },
          {
            label: "Pendientes", value: String(kpis.pendientes),
            sub: kpis.pendientes === 1 ? "propietario por pagar" : "propietarios por pagar",
            Icon: Clock, topCls: "bg-amber-600", valCls: "text-amber-700",
          },
          {
            label: "Pagados", value: String(kpis.pagados),
            sub: kpis.pagados === 1 ? "propietario saldado" : "propietarios saldados",
            Icon: CheckCircle2, topCls: "bg-emerald-600", valCls: "text-emerald-700",
          },
          {
            label: "Neto a pagar", value: fmtUsd(kpis.netUsdEquiv),
            sub: kpis.netRd > 0
              ? `${fmtUsd(kpis.netUsd)} + ${fmtRd(kpis.netRd)}`
              : "Equivalente USD",
            Icon: Wallet, topCls: "bg-[#2D6A9F]", valCls: "text-[#2D6A9F]",
          },
          {
            label: "Total pagado", value: fmtUsd(kpis.paidUsd),
            sub: kpis.paidRd > 0 ? fmtRd(kpis.paidRd) : "—",
            Icon: TrendingUp, topCls: "bg-blue-600", valCls: "text-blue-700",
          },
          {
            label: "Por pagar", value: fmtUsd(Math.max(0, kpis.netUsd - kpis.settledUsd)),
            sub: (kpis.netRd - kpis.settledRd) > 0.01 ? fmtRd(Math.max(0, kpis.netRd - kpis.settledRd)) : "—",
            Icon: TrendingDown, topCls: "bg-red-600", valCls: "text-red-700",
          },
        ] as const).map(({ label, value, sub, Icon, topCls, valCls }) => (
          <div key={label} className="rounded-xl overflow-hidden shadow-sm border border-black/[0.08]">
            <div className={`${topCls} px-4 py-2.5 flex items-center justify-between`}>
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/75">{label}</span>
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Icon size={15} strokeWidth={2} className="text-white" />
              </div>
            </div>
            <div className="bg-white px-4 pt-3 pb-3">
              <p className={`text-xl font-serif font-bold truncate ${valCls}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Owners statements list */}
      <Card>
        <CardContent className="p-0">
          {statements.length === 0 ? (
            <div className="py-12 text-center">
              <Banknote size={32} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No hay propietarios activos</p>
            </div>
          ) : (
            <>
            {/* ── MOBILE CARDS (< lg) ─────────────────────────────── */}
            <div className="lg:hidden divide-y">
              {statements.map((s) => {
                const statusBadge = {
                  "Pagado": <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 size={10} /> Pagado</Badge>,
                  "Parcial": <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><Clock size={10} /> Parcial</Badge>,
                  "Pendiente": <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1"><AlertTriangle size={10} /> Pendiente</Badge>,
                  "Sin movimiento": <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">Sin mov.</Badge>,
                }[s.status];
                const isMuted = s.status === "Sin movimiento";
                return (
                  <div key={s.owner.id} className={cn("p-4 space-y-3", isMuted && "opacity-60")}>
                    {/* Header: owner + status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#0F2B4C] text-base">{s.owner.full_name}</p>
                        {s.owner.co_owner_name && <p className="text-xs text-muted-foreground">y {s.owner.co_owner_name}</p>}
                        {s.properties.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {s.properties.map((p) => (
                              <Badge key={p.id} variant="outline" className="text-[10px] gap-1 bg-slate-50">
                                <Building2 size={9} /> {p.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">{statusBadge}</div>
                    </div>

                    {/* Data grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50/60 rounded-lg p-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Reservas</p>
                        <p className="font-semibold">{s.reservationsCount} <span className="text-xs text-muted-foreground font-normal">· {s.totalNights} noches</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Ingresos</p>
                        <p className="font-semibold text-emerald-700">
                          {s.incomeUsd > 0 && <span>{fmtUsd(s.incomeUsd)}</span>}
                          {s.incomeUsd > 0 && s.incomeRd > 0 && <span className="text-muted-foreground"> · </span>}
                          {s.incomeRd > 0 && <span className="text-xs">{fmtRd(s.incomeRd)}</span>}
                          {s.incomeUsd === 0 && s.incomeRd === 0 && <span className="text-muted-foreground font-normal">—</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Cargos</p>
                        <p className="font-semibold text-red-700">
                          {s.chargesUsd > 0 ? fmtUsd(s.chargesUsd) : <span className="text-muted-foreground font-normal">—</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Transferido</p>
                        <p className="font-semibold text-blue-700">
                          {s.paidUsd > 0 && <span>{fmtUsd(s.paidUsd)}</span>}
                          {s.paidUsd === 0 && s.paidRd === 0 && <span className="text-muted-foreground font-normal">—</span>}
                        </p>
                      </div>
                    </div>

                    {/* Neto highlight */}
                    <div className="flex items-center justify-between bg-[#0F2B4C]/[0.03] border border-[#0F2B4C]/10 rounded-lg p-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Neto a pagar</p>
                        {(s.netUsd > 0.01 && s.netRd > 0.01) && (
                          <p className="text-[10px] text-muted-foreground">{fmtUsd(s.netUsd)} + {fmtRd(s.netRd)}</p>
                        )}
                      </div>
                      <p className="text-xl font-serif font-bold text-[#0F2B4C]">
                        {s.netUsdEquiv > 0.01 ? fmtUsd(s.netUsdEquiv) : "—"}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline" size="sm" className="flex-1 h-10"
                        onClick={() => handleOpenStatement(s)}
                      >
                        <FileText size={14} className="mr-1.5" /> Ver estado
                      </Button>
                      {s.status !== "Sin movimiento" && s.status !== "Pagado" && (
                        <Button
                          variant="default" size="sm"
                          className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleRegisterPayment(s)}
                        >
                          <Plus size={14} className="mr-1.5" /> Pagar
                        </Button>
                      )}
                      {s.payments.length > 0 && s.status === "Pagado" && (
                        <Button
                          variant="outline" size="sm" className="h-10"
                          onClick={() => handleEditPayment(s.payments[0], s.owner)}
                        >
                          <Edit3 size={14} className="mr-1.5" /> Editar pago
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── DESKTOP TABLE (lg+) ─────────────────────────────── */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Propietario</th>
                    <th className="text-left px-3 py-3">Propiedades</th>
                    <th className="text-right px-3 py-3">Reservas</th>
                    <th className="text-right px-3 py-3">Ingresos</th>
                    <th className="text-right px-3 py-3">Cargos</th>
                    <th className="text-right px-3 py-3">Neto</th>
                    <th className="text-right px-3 py-3">Transferido</th>
                    <th className="text-right px-3 py-3">Costo trans.</th>
                    <th className="text-center px-3 py-3">Estado</th>
                    <th className="text-right px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {statements.map((s) => {
                    const statusBadge = {
                      "Pagado": <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 size={10} /> Pagado</Badge>,
                      "Parcial": <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><Clock size={10} /> Parcial</Badge>,
                      "Pendiente": <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1"><AlertTriangle size={10} /> Pendiente</Badge>,
                      "Sin movimiento": <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">Sin mov.</Badge>,
                    }[s.status];

                    const isMuted = s.status === "Sin movimiento";

                    return (
                      <tr key={s.owner.id} className={cn("border-b hover:bg-slate-50/50 transition-colors", isMuted && "opacity-60")}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#0F2B4C]">{s.owner.full_name}</p>
                          {s.owner.co_owner_name && <p className="text-[10px] text-muted-foreground">y {s.owner.co_owner_name}</p>}
                          {s.owner.bank_name && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Hash size={9} /> {s.owner.bank_name} {s.owner.bank_account && `· ${s.owner.bank_account.slice(-4).padStart(s.owner.bank_account.length, "•")}`}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {s.properties.length === 0 ? (
                            <span className="text-muted-foreground italic text-[10px]">Sin propiedades</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {s.properties.map((p) => (
                                <Badge key={p.id} variant="outline" className="text-[10px] gap-1 bg-slate-50">
                                  <Building2 size={8} /> {p.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <p className="font-semibold">{s.reservationsCount}</p>
                          <p className="text-[10px] text-muted-foreground">{s.totalNights} noches</p>
                        </td>
                        <td className="px-3 py-3 text-right font-medium">
                          {s.incomeUsd > 0 && <div className="text-emerald-700">{fmtUsd(s.incomeUsd)}</div>}
                          {s.incomeRd > 0 && <div className="text-emerald-700 text-[10px]">{fmtRd(s.incomeRd)}</div>}
                          {s.incomeUsd === 0 && s.incomeRd === 0 && <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right font-medium">
                          {s.chargesUsd > 0 && <div className="text-red-700">{fmtUsd(s.chargesUsd)}</div>}
                          {s.chargesRd > 0 && <div className="text-red-700 text-[10px]">{fmtRd(s.chargesRd)}</div>}
                          {s.chargesUsd === 0 && s.chargesRd === 0 && <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right font-bold">
                          {s.netUsdEquiv > 0.01 ? (
                            <>
                              <div className="text-[#0F2B4C]">{fmtUsd(s.netUsdEquiv)}</div>
                              {(s.netUsd > 0.01 || s.netRd > 0.01) && (s.netUsd > 0.01 ? s.netRd > 0.01 : true) && (
                                <div className="text-[9px] text-muted-foreground font-normal">
                                  {s.netUsd > 0.01 && <span>{fmtUsd(s.netUsd)}</span>}
                                  {s.netUsd > 0.01 && s.netRd > 0.01 && <span> + </span>}
                                  {s.netRd > 0.01 && <span>{fmtRd(s.netRd)}</span>}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground font-normal">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {s.paidUsd > 0 && <div className="text-blue-700 font-medium">{fmtUsd(s.paidUsd)}</div>}
                          {s.paidRd > 0 && <div className="text-blue-700 text-[10px]">{fmtRd(s.paidRd)}</div>}
                          {s.paidUsd === 0 && s.paidRd === 0 && <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {s.transferCostUsd > 0 && <div className="text-amber-700 font-medium">{fmtUsd(s.transferCostUsd)}</div>}
                          {s.transferCostRd > 0 && <div className="text-amber-700 text-[10px]">{fmtRd(s.transferCostRd)}</div>}
                          {s.transferCostUsd === 0 && s.transferCostRd === 0 && <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center">{statusBadge}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#2D6A9F]/10"
                              onClick={() => handleOpenStatement(s)}
                              title="Ver estado de cuenta"
                            >
                              <FileText size={15} className="text-[#2D6A9F]" />
                            </Button>
                            {s.status !== "Sin movimiento" && s.status !== "Pagado" && (
                              <Button
                                variant="default" size="sm"
                                className="h-8 bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleRegisterPayment(s)}
                              >
                                <Plus size={13} className="mr-1" /> Pagar
                              </Button>
                            )}
                            {s.payments.length > 0 && s.status === "Pagado" && (
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8 hover:bg-amber-50"
                                onClick={() => handleEditPayment(s.payments[0], s.owner)}
                                title="Editar pago"
                              >
                                <Edit3 size={14} className="text-amber-600" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent payments — filtered by active property's owner when set */}
      {(() => {
        const recentPayments = activePropertyOwnerId
          ? payments.filter((p) => p.owner_id === activePropertyOwnerId)
          : payments;
        if (recentPayments.length === 0) return null;
        return (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0F2B4C] flex items-center gap-2">
                <Banknote size={15} className="text-blue-600" />
                Historial de pagos recientes
                {activeProperty && (
                  <span className="text-[10px] text-muted-foreground font-normal flex items-center gap-1">
                    · <Building2 size={10} /> {activeProperty.name}
                  </span>
                )}
              </h2>
              <span className="text-[10px] text-muted-foreground">{recentPayments.length} pago{recentPayments.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5">Fecha</th>
                    <th className="text-left px-3 py-2.5">Propietario</th>
                    <th className="text-left px-3 py-2.5">Período</th>
                    <th className="text-left px-3 py-2.5">Método</th>
                    <th className="text-left px-3 py-2.5">Referencia</th>
                    <th className="text-right px-3 py-2.5">Transferido</th>
                    <th className="text-right px-3 py-2.5">Costo</th>
                    <th className="text-right px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.slice(0, 10).map((p: OwnerPayment) => {
                    const owner = owners.find((o) => o.id === p.owner_id);
                    return (
                      <tr key={p.id} className="border-t hover:bg-slate-50/50">
                        <td className="px-4 py-2">{fmtDate(p.payment_date)}</td>
                        <td className="px-3 py-2 font-medium">{owner?.full_name ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{MONTHS_ES[p.period_month - 1]} {p.period_year}</td>
                        <td className="px-3 py-2">{p.payment_method}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.reference ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold text-blue-700">
                          {p.amount_paid_usd > 0 && <div>{fmtUsd(p.amount_paid_usd)}</div>}
                          {p.amount_paid_rd > 0 && <div className="text-[10px]">{fmtRd(p.amount_paid_rd)}</div>}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-amber-700">
                          {(p.transfer_cost_usd ?? 0) > 0 && <div>{fmtUsd(p.transfer_cost_usd)}</div>}
                          {(p.transfer_cost_rd ?? 0) > 0 && <div className="text-[10px]">{fmtRd(p.transfer_cost_rd)}</div>}
                          {(!p.transfer_cost_usd || p.transfer_cost_usd === 0) && (!p.transfer_cost_rd || p.transfer_cost_rd === 0) && <span className="text-muted-foreground font-normal">—</span>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => owner && handleEditPayment(p, owner)}>
                              <Edit3 size={13} className="text-[#2D6A9F]" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-50"
                              onClick={() => setDeleteTarget(p)}>
                              <Trash2 size={13} className="text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        );
      })()}

      {/* Payment form dialog */}
      <PaymentFormDialog
        open={paymentFormOpen}
        onOpenChange={(v) => { setPaymentFormOpen(v); if (!v) { setEditingPayment(null); setFormOwner(null); } }}
        editing={editingPayment}
        owner={formOwner}
        defaultMonth={month}
        defaultYear={year}
        defaultNetUsd={formNetUsd}
        defaultNetRd={formNetRd}
        defaultNetUsdEquiv={formNetUsdEquiv}
        defaultExchangeRate={formExchangeRate}
        onSave={handleSavePayment}
        saving={createPayment.isPending || updatePayment.isPending}
      />

      {/* Statement detail dialog */}
      <StatementDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        statement={detailStatement}
        periodLabel={periodLabel}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              Eliminar pago
            </DialogTitle>
            <DialogDescription>
              ¿Eliminar este registro de pago? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeletePayment} disabled={deletePayment.isPending}>
              {deletePayment.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
