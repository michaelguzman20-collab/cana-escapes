import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp, Building2, ChevronLeft, ChevronRight,
  Filter, Receipt, Plus, Pencil, Trash2, X,
  AlertTriangle, ChevronDown, ChevronUp, Download,
  ListPlus, Package, DollarSign, Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useAllReservationsGlobal } from "@/hooks/useReservations";
import { useProperties } from "@/hooks/useProperties";
import {
  useCharges, useChargeItems, useCreateCharge,
  useUpdateCharge, useDeleteCharge,
  useCeSettings, useUpdateCeSetting,
} from "@/hooks/useCharges";
import type {
  Charge, ChargeInsert, ChargeItemInsert,
  Reservation, Property,
} from "@/types/database";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  }).format(n);
}

function fmtRd(n: number) {
  return `RD$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtCurr(n: number, currency: string) {
  return currency === "USD" ? fmtUsd(n) : fmtRd(n);
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-DO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const CE_CATEGORIES = [
  "Oficina", "Software", "Marketing", "Personal", "Transporte",
  "Comunicaciones", "Legal", "Bancario", "Otro",
];

// ── CE Expense form dialog ───────────────────────────────────────────────────
function CeExpenseFormDialog({
  open, onClose, editing, properties,
}: {
  open: boolean;
  onClose: () => void;
  editing: Charge | null;
  properties: Property[];
}) {
  const create = useCreateCharge();
  const update = useUpdateCharge();

  const [propertyId, setPropertyId] = useState("");
  const [category, setCategory] = useState("Otro");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<{ description: string; quantity: number; unit_price: number; total: number }[]>([]);
  const [showItems, setShowItems] = useState(false);

  const { data: existingItems } = useChargeItems(editing?.id ?? null);

  const amountUsd = currency === "USD" ? amount : +(amount / exchangeRate).toFixed(2);
  const itemsTotal = items.reduce((s, it) => s + it.total, 0);

  useEffect(() => {
    if (editing) {
      setPropertyId(editing.property_id ?? "");
      setCategory(editing.category);
      setDescription(editing.description);
      setCurrency(editing.currency);
      setAmount(editing.amount);
      setExchangeRate(editing.exchange_rate);
      setDate(editing.date);
      setNotes(editing.notes ?? "");
      setShowItems(true);
    } else {
      setPropertyId("");
      setCategory("Otro");
      setDescription("");
      setCurrency("USD");
      setAmount(0);
      setExchangeRate(1);
      setDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setItems([]);
      setShowItems(false);
    }
  }, [editing]);

  useEffect(() => {
    if (existingItems && existingItems.length > 0) {
      setItems(existingItems.map((it) => ({
        description: it.description, quantity: it.quantity,
        unit_price: it.unit_price, total: it.total,
      })));
      setShowItems(true);
    }
  }, [existingItems]);

  useEffect(() => {
    if (items.length > 0) setAmount(itemsTotal);
  }, [itemsTotal, items.length]);

  function updateItem(idx: number, field: string, value: string | number) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, [field]: value };
        if (field === "quantity" || field === "unit_price")
          next.total = +(next.quantity * next.unit_price).toFixed(2);
        return next;
      })
    );
  }

  async function handleSave() {
    if (!description.trim()) {
      toast({ title: "Descripción requerida", variant: "destructive" });
      return;
    }
    const charge: ChargeInsert = {
      property_id: propertyId || null,
      owner_id: null,
      charge_type: "empresa",
      category,
      description: description.trim(),
      currency,
      amount,
      exchange_rate: exchangeRate,
      amount_usd: amountUsd,
      date,
      status: "Pagado",
      notes: notes.trim() || null,
    };
    const cleanItems: Omit<ChargeItemInsert, "charge_id">[] = items
      .filter((it) => it.description.trim())
      .map((it) => ({
        description: it.description.trim(),
        quantity: it.quantity,
        unit_price: it.unit_price,
        total: it.total,
      }));
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, charge, items: cleanItems });
        toast({ title: "Gasto actualizado" });
      } else {
        await create.mutateAsync({ charge, items: cleanItems });
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
          <DialogTitle>{editing ? "Editar gasto CE" : "Nuevo gasto CE"}</DialogTitle>
          <DialogDescription>
            Registra un gasto operativo de Cana Escapes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Propiedad (opcional)</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">General (sin propiedad)</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción *</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Pago licencia software" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Moneda</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="RD$">RD$</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Monto</label>
                <Input type="number" step="0.01" min="0" value={amount || ""} onChange={(e) => setAmount(+e.target.value)} disabled={items.length > 0} />
              </div>
              {currency !== "USD" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tasa</label>
                  <Input type="number" step="0.01" min="0.01" value={exchangeRate || ""} onChange={(e) => setExchangeRate(+e.target.value)} />
                </div>
              )}
            </div>
          </div>
          {currency !== "USD" && (
            <div className="text-xs text-muted-foreground">Equivalente USD: <strong>{fmtUsd(amountUsd)}</strong></div>
          )}

          {/* Items */}
          <div className="border rounded-lg p-3 space-y-3 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-[#0F2B4C] hover:underline"
                onClick={() => { setShowItems(!showItems); if (!showItems && items.length === 0) setItems([{ description: "", quantity: 1, unit_price: 0, total: 0 }]); }}>
                <Package size={14} /> Ítems ({items.length})
                {showItems ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showItems && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                  onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0, total: 0 }])}>
                  <ListPlus size={13} className="mr-1" /> Agregar
                </Button>
              )}
            </div>
            {showItems && items.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_70px_90px_90px_32px] gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  <span>Descripción</span><span>Cant.</span><span>Precio U.</span><span>Total</span><span />
                </div>
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_70px_90px_90px_32px] gap-2 items-center">
                    <Input value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Ítem" className="h-8 text-sm" />
                    <Input type="number" step="0.01" min="0" value={it.quantity || ""} onChange={(e) => updateItem(idx, "quantity", +e.target.value)} className="h-8 text-sm" />
                    <Input type="number" step="0.01" min="0" value={it.unit_price || ""} onChange={(e) => updateItem(idx, "unit_price", +e.target.value)} className="h-8 text-sm" />
                    <div className="h-8 flex items-center text-sm font-medium px-2 bg-white border rounded-md">{fmtCurr(it.total, currency)}</div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                      <X size={14} />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-end text-sm font-semibold pt-1 pr-12">Total: {fmtCurr(itemsTotal, currency)}</div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notas</label>
            <textarea className="w-full border rounded-md px-3 py-2 text-sm bg-white resize-none" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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

// ── Main page ────────────────────────────────────────────────────────────────
export function AdminCanaEscapes() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [propFilter, setPropFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"general" | "mes">("mes");

  const { data: allReservations = [] } = useAllReservationsGlobal();
  const { data: properties = [] } = useProperties();
  const { data: ceCharges = [] } = useCharges("empresa");
  const { data: ceSettings } = useCeSettings();
  const updateSetting = useUpdateCeSetting();
  const deleteCharge = useDeleteCharge();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Charge | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Charge | null>(null);
  const [showStaysConfig, setShowStaysConfig] = useState(false);

  // Stays.net config from settings
  const staysActive = ceSettings?.staysnet_active === "true";
  const staysFixed = parseFloat(ceSettings?.staysnet_fixed_usd ?? "50");
  const staysPct = parseFloat(ceSettings?.staysnet_pct ?? "1.8");

  // ── Filter reservations ────────────────────────────────────────────────────
  const filteredRes = useMemo(() => {
    let res = allReservations;
    if (viewMode === "mes") {
      res = res.filter((r: Reservation) => r.period_month === month && r.period_year === year);
    }
    if (propFilter !== "all") {
      res = res.filter((r: Reservation) => r.property_id === propFilter);
    }
    return res;
  }, [allReservations, month, year, propFilter, viewMode]);

  // ── Filter CE expenses ─────────────────────────────────────────────────────
  const filteredCharges = useMemo(() => {
    let ch = ceCharges;
    if (viewMode === "mes") {
      ch = ch.filter((c: Charge) => {
        const d = new Date(c.date + "T12:00:00");
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    }
    if (propFilter !== "all") {
      ch = ch.filter((c: Charge) => c.property_id === propFilter || c.property_id === null);
    }
    return ch;
  }, [ceCharges, month, year, propFilter, viewMode]);

  // ── Calculate CE income from reservations ──────────────────────────────────
  const ceIncomeByProp = useMemo(() => {
    const map: Record<string, { ceUsd: number; ceRd: number; resCount: number; nights: number; grossUsd: number; grossRd: number; totalRes: number; totalNights: number }> = {};
    for (const r of filteredRes) {
      if (!map[r.property_id]) map[r.property_id] = { ceUsd: 0, ceRd: 0, resCount: 0, nights: 0, grossUsd: 0, grossRd: 0, totalRes: 0, totalNights: 0 };
      const entry = map[r.property_id];
      entry.totalRes++;
      entry.totalNights += r.nights;
      if (r.status !== "Completada" && r.status !== "Confirmada") continue;
      entry.resCount++;
      entry.nights += r.nights;
      if (r.currency === "USD") {
        entry.ceUsd += r.ce_amount;
        entry.grossUsd += r.gross_amount;
      } else {
        entry.ceRd += r.ce_amount;
        entry.grossRd += r.gross_amount;
      }
    }
    return map;
  }, [filteredRes]);

  const totalCeUsd = Object.values(ceIncomeByProp).reduce((s, v) => s + v.ceUsd, 0);
  const totalCeRd = Object.values(ceIncomeByProp).reduce((s, v) => s + v.ceRd, 0);
  const totalGrossUsd = Object.values(ceIncomeByProp).reduce((s, v) => s + v.grossUsd, 0);
  const totalResCount = filteredRes.length;

  // Equiv USD for RD$ (using average exchange rate from reservations)
  const rdReservations = filteredRes.filter((r: Reservation) => r.currency !== "USD" && r.exchange_rate > 0);
  const avgExRate = rdReservations.length > 0
    ? rdReservations.reduce((s: number, r: Reservation) => s + r.exchange_rate, 0) / rdReservations.length
    : 60;
  const ceRdInUsd = avgExRate > 0 ? totalCeRd / avgExRate : 0;
  const totalCeEquivUsd = totalCeUsd + ceRdInUsd;

  // ── Deductions total ───────────────────────────────────────────────────────
  const totalDeducUsd = filteredCharges.reduce((s: number, c: Charge) => s + c.amount_usd, 0);

  // ── Stays.net calculation ──────────────────────────────────────────────────
  const staysFixedCost = staysActive ? staysFixed : 0;
  const staysVarCost = staysActive ? +(totalGrossUsd * staysPct / 100).toFixed(2) : 0;
  const staysTotalCost = staysFixedCost + staysVarCost;

  // ── Net final ──────────────────────────────────────────────────────────────
  const netFinalUsd = totalCeEquivUsd - totalDeducUsd - staysTotalCost;

  // ── Projections ────────────────────────────────────────────────────────────
  const confirmedRes = filteredRes.filter((r: Reservation) => r.status === "Completada" || r.status === "Confirmada");
  const pendingRes = filteredRes.filter((r: Reservation) => r.status !== "Completada" && r.status !== "Confirmada" && r.status !== "Cancelada");
  const confirmedCeUsd = confirmedRes.reduce((s: number, r: Reservation) => s + (r.currency === "USD" ? r.ce_amount : 0), 0);
  const confirmedCeRd = confirmedRes.reduce((s: number, r: Reservation) => s + (r.currency !== "USD" ? r.ce_amount : 0), 0);
  const pendingCeUsd = pendingRes.reduce((s: number, r: Reservation) => s + (r.currency === "USD" ? r.ce_amount : 0), 0);
  const pendingCeRd = pendingRes.reduce((s: number, r: Reservation) => s + (r.currency !== "USD" ? r.ce_amount : 0), 0);

  // ── Period navigation ──────────────────────────────────────────────────────
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  }

  function downloadCSV() {
    const headers = ["Tipo", "Fecha", "Propiedad", "Descripción", "Categoría", "Moneda", "Monto", "Equiv USD"];
    const rows: (string | number)[][] = [];
    for (const r of filteredRes) {
      const prop = properties.find((p) => p.id === r.property_id);
      rows.push(["Ingreso", r.checkin, prop?.name ?? "", `${r.guest_name} (${r.platform})`, "Reserva", r.currency, r.ce_amount, r.currency === "USD" ? r.ce_amount : +(r.ce_amount / r.exchange_rate).toFixed(2)]);
    }
    for (const c of filteredCharges) {
      const prop = properties.find((p) => p.id === c.property_id);
      rows.push(["Deducción", c.date, prop?.name ?? "General", c.description, c.category, c.currency, c.amount, c.amount_usd]);
    }
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cana_escapes_${year}_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCharge.mutateAsync(deleteTarget.id);
      toast({ title: "Gasto eliminado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeleteTarget(null);
  }

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8] overflow-x-hidden">
    <div className="max-w-screen-2xl mx-auto space-y-4 text-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-[#0F2B4C]" />
          <h1 className="text-xl font-bold text-[#0F2B4C]">Cana Escapes</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <Download size={14} className="mr-1" /> Exportar
          </Button>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0F2B4C]/5 rounded-xl px-4 py-2.5 mb-5">
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex bg-white rounded-lg border overflow-hidden text-xs">
            <button className={`px-3 py-1.5 font-medium transition-colors ${viewMode === "mes" ? "bg-[#0F2B4C] text-white" : "text-[#0F2B4C]"}`}
              onClick={() => setViewMode("mes")}>Mensual</button>
            <button className={`px-3 py-1.5 font-medium transition-colors ${viewMode === "general" ? "bg-[#0F2B4C] text-white" : "text-[#0F2B4C]"}`}
              onClick={() => setViewMode("general")}>General</button>
          </div>

          {/* Month nav (only in mes mode) */}
          {viewMode === "mes" && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm font-semibold text-[#0F2B4C] min-w-[120px] text-center">
                {MONTHS[month]} {year}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>

        {/* Property filter */}
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-[#0F2B4C]/60" />
          <select className="border rounded-md px-2 py-1.5 text-xs bg-white"
            value={propFilter} onChange={(e) => setPropFilter(e.target.value)}>
            <option value="all">Todas las propiedades</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Stats cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {([
          {
            label: "CE Bruto USD", value: fmtUsd(totalCeUsd),
            sub: totalCeRd > 0 ? `+ ${fmtRd(totalCeRd)}` : "—",
            Icon: DollarSign, topCls: "bg-emerald-600", valCls: "text-emerald-700",
          },
          {
            label: "Deducciones", value: fmtUsd(totalDeducUsd),
            sub: staysActive ? `+ Stays.net: ${fmtUsd(staysTotalCost)}` : "Gastos CE",
            Icon: Package, topCls: "bg-red-600", valCls: "text-red-700",
          },
          {
            label: "Neto CE (USD)", value: fmtUsd(netFinalUsd),
            sub: netFinalUsd >= 0 ? "Resultado positivo" : "Resultado negativo",
            Icon: TrendingUp, topCls: netFinalUsd >= 0 ? "bg-[#0F2B4C]" : "bg-red-600",
            valCls: netFinalUsd >= 0 ? "text-[#0F2B4C]" : "text-red-700",
          },
          {
            label: "Reservas", value: String(totalResCount),
            sub: `${filteredRes.reduce((s: number, r: Reservation) => s + r.nights, 0)} noches`,
            Icon: ListPlus, topCls: "bg-[#2D6A9F]", valCls: "text-[#2D6A9F]",
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

      {/* ── Ingresos Brutos CE ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm mb-5">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <DollarSign size={15} className="text-green-600" />
          <h2 className="text-sm font-bold text-[#0F2B4C]">Ingresos Brutos — Cana Escapes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-gray-50">
                <th className="text-left px-4 py-2">Propiedad</th>
                <th className="text-right px-3 py-2">Reservas</th>
                <th className="text-right px-3 py-2">Noches</th>
                <th className="text-right px-3 py-2">CE USD</th>
                <th className="text-right px-3 py-2">CE RD$</th>
                <th className="text-right px-4 py-2">Equiv USD</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ceIncomeByProp)
                .sort(([, a], [, b]) => (b.ceUsd + b.ceRd) - (a.ceUsd + a.ceRd))
                .map(([propId, data]) => {
                const prop = properties.find((p) => p.id === propId);
                const equivUsd = data.ceUsd + (avgExRate > 0 ? data.ceRd / avgExRate : 0);
                const hasCeIncome = data.ceUsd > 0 || data.ceRd > 0;
                return (
                  <tr key={propId} className={`border-t hover:bg-gray-50/50 ${!hasCeIncome ? "text-muted-foreground" : ""}`}>
                    <td className="px-4 py-2 font-medium flex items-center gap-1.5">
                      <Building2 size={12} className="text-[#0F2B4C]/50" /> {prop?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{data.totalRes}</td>
                    <td className="px-3 py-2 text-right">{data.totalNights}</td>
                    <td className={`px-3 py-2 text-right font-medium ${hasCeIncome ? "text-green-700" : ""}`}>{fmtUsd(data.ceUsd)}</td>
                    <td className={`px-3 py-2 text-right font-medium ${data.ceRd > 0 ? "text-blue-700" : ""}`}>{data.ceRd > 0 ? fmtRd(data.ceRd) : "—"}</td>
                    <td className="px-4 py-2 text-right font-semibold">{fmtUsd(equivUsd)}</td>
                  </tr>
                );
              })}
              {Object.keys(ceIncomeByProp).length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground italic">Sin ingresos en este período</td></tr>
              )}
            </tbody>
            {Object.keys(ceIncomeByProp).length > 0 && (
              <tfoot>
                <tr className="border-t-2 bg-gray-50 font-semibold">
                  <td className="px-4 py-2">TOTAL</td>
                  <td className="px-3 py-2 text-right">{Object.values(ceIncomeByProp).reduce((s, v) => s + v.totalRes, 0)}</td>
                  <td className="px-3 py-2 text-right">{Object.values(ceIncomeByProp).reduce((s, v) => s + v.totalNights, 0)}</td>
                  <td className="px-3 py-2 text-right text-green-700">{fmtUsd(totalCeUsd)}</td>
                  <td className="px-3 py-2 text-right text-blue-700">{totalCeRd > 0 ? fmtRd(totalCeRd) : "—"}</td>
                  <td className="px-4 py-2 text-right">{fmtUsd(totalCeEquivUsd)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Deducciones CE ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm mb-5">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={15} className="text-red-500" />
            <h2 className="text-sm font-bold text-[#0F2B4C]">Mis Deducciones — Gastos CE</h2>
          </div>
          <Button size="sm" className="h-7 text-xs" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={13} className="mr-1" /> Agregar
          </Button>
        </div>
        {filteredCharges.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground italic">Sin deducciones registradas</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-gray-50">
                  <th className="text-left px-4 py-2">Concepto</th>
                  <th className="text-left px-3 py-2">Categoría</th>
                  <th className="text-left px-3 py-2">Fecha</th>
                  <th className="text-right px-3 py-2">Monto USD</th>
                  <th className="text-right px-3 py-2">Monto RD$</th>
                  <th className="text-right px-3 py-2">Equiv USD</th>
                  <th className="text-right px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredCharges.map((c: Charge) => (
                  <tr key={c.id} className="border-t hover:bg-gray-50/50">
                    <td className="px-4 py-2 font-medium">{c.description}</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0F2B4C]/10">{c.category}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtDate(c.date)}</td>
                    <td className="px-3 py-2 text-right font-medium">{c.currency === "USD" ? fmtUsd(c.amount) : "—"}</td>
                    <td className="px-3 py-2 text-right font-medium">{c.currency !== "USD" ? fmtRd(c.amount) : "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold text-red-600">{fmtUsd(c.amount_usd)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditing(c); setFormOpen(true); }}>
                          <Pencil size={12} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => setDeleteTarget(c)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-gray-50 font-semibold">
                  <td colSpan={5} className="px-4 py-2">TOTAL DEDUCCIONES</td>
                  <td className="px-3 py-2 text-right text-red-600">{fmtUsd(totalDeducUsd)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Stays.net ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm mb-5">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi size={15} className="text-purple-500" />
            <h2 className="text-sm font-bold text-[#0F2B4C]">Stays.net — Channel Manager</h2>
            {!staysActive && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-muted-foreground">Inactivo</span>}
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowStaysConfig(!showStaysConfig)}>
            {showStaysConfig ? "Cerrar" : "Configurar"}
          </Button>
        </div>

        {showStaysConfig && (
          <div className="px-4 py-3 border-b bg-purple-50/30 space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={staysActive}
                  onChange={(e) => updateSetting.mutate({ key: "staysnet_active", value: e.target.checked ? "true" : "false" })} />
                Activo
              </label>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Cuota fija USD:</label>
                <Input type="number" step="0.01" className="h-7 w-24 text-xs"
                  defaultValue={staysFixed}
                  onBlur={(e) => updateSetting.mutate({ key: "staysnet_fixed_usd", value: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">% por reserva:</label>
                <Input type="number" step="0.01" className="h-7 w-20 text-xs"
                  defaultValue={staysPct}
                  onBlur={(e) => updateSetting.mutate({ key: "staysnet_pct", value: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {staysActive && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-2">Cuota fija mensual</td>
                  <td className="px-3 py-2 text-right font-medium">{fmtUsd(staysFixed)}</td>
                  <td className="px-4 py-2 text-muted-foreground">Fijo cada mes</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2">{staysPct}% por reserva</td>
                  <td className="px-3 py-2 text-right font-medium">{fmtUsd(staysVarCost)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{totalResCount} reservas × {staysPct}% sobre bruto USD</td>
                </tr>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-2">TOTAL STAYS.NET</td>
                  <td className="px-3 py-2 text-right text-purple-700">{fmtUsd(staysTotalCost)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{fmtUsd(staysFixed)} fijo + {fmtUsd(staysVarCost)} variable</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {!staysActive && !showStaysConfig && (
          <div className="px-4 py-4 text-xs text-muted-foreground italic">
            Stays.net no está activo. Haz clic en "Configurar" para habilitarlo.
          </div>
        )}
      </div>

      {/* ── Proyecciones ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm mb-5">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <TrendingUp size={15} className="text-blue-500" />
          <h2 className="text-sm font-bold text-[#0F2B4C]">Proyecciones</h2>
        </div>
        <div className="grid grid-cols-2 divide-x">
          <div className="p-4">
            <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-2">Confirmado / Cobrado</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span>Reservas:</span><span className="font-semibold">{confirmedRes.length}</span></div>
              <div className="flex justify-between"><span>CE USD:</span><span className="font-semibold text-green-700">{fmtUsd(confirmedCeUsd)}</span></div>
              {confirmedCeRd > 0 && <div className="flex justify-between"><span>CE RD$:</span><span className="font-semibold text-blue-700">{fmtRd(confirmedCeRd)}</span></div>}
            </div>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-semibold text-yellow-600 uppercase tracking-wider mb-2">Pendiente / Por percibir</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span>Reservas:</span><span className="font-semibold">{pendingRes.length}</span></div>
              <div className="flex justify-between"><span>CE USD:</span><span className="font-semibold text-yellow-700">{fmtUsd(pendingCeUsd)}</span></div>
              {pendingCeRd > 0 && <div className="flex justify-between"><span>CE RD$:</span><span className="font-semibold text-yellow-700">{fmtRd(pendingCeRd)}</span></div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Neto Final ──────────────────────────────────────────────────────── */}
      <div className={`rounded-xl border shadow-sm p-4 mb-5 ${netFinalUsd >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
        <h2 className="text-sm font-bold text-[#0F2B4C] mb-3 flex items-center gap-2">
          <DollarSign size={15} /> Neto Final Cana Escapes
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">CE Bruto USD</p>
            <p className="font-bold text-sm text-green-700">{fmtUsd(totalCeUsd)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">CE Bruto RD$</p>
            <p className="font-bold text-sm text-blue-700">{totalCeRd > 0 ? fmtRd(totalCeRd) : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total equiv USD</p>
            <p className="font-bold text-sm">{fmtUsd(totalCeEquivUsd)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tasa prom. RD$</p>
            <p className="font-bold text-sm">{avgExRate.toFixed(2)}</p>
          </div>
        </div>
        <div className="border-t mt-3 pt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Mis deducciones</p>
            <p className="font-bold text-sm text-red-600">−{fmtUsd(totalDeducUsd)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Stays.net</p>
            <p className="font-bold text-sm text-purple-600">−{fmtUsd(staysTotalCost)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">NETO FINAL CE (USD)</p>
            <p className={`font-bold text-xl ${netFinalUsd >= 0 ? "text-green-700" : "text-red-600"}`}>{fmtUsd(netFinalUsd)}</p>
          </div>
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <CeExpenseFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        editing={editing}
        properties={properties}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" /> Eliminar gasto
            </DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar "{deleteTarget?.description}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteCharge.isPending}>
              {deleteCharge.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
