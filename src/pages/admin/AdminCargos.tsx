import { useState, useEffect, useMemo } from "react";
import {
  Receipt, Plus, Pencil, Trash2, Search, X,
  Building2, Download, ChevronDown, ChevronUp,
  AlertTriangle, ListPlus, Package,
  ChevronLeft, ChevronRight, CheckCircle2, Clock, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  useCharges, useChargeItems, useCreateCharge,
  useUpdateCharge, useDeleteCharge,
} from "@/hooks/useCharges";
import { useProperties } from "@/hooks/useProperties";
import { useOwners } from "@/hooks/useOwners";
import { useProperty } from "@/contexts/PropertyContext";
import type {
  Charge, ChargeInsert, ChargeItemInsert,
  Property, Owner,
} from "@/types/database";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const CATEGORIES = [
  "Mantenimiento", "Limpieza", "Reparación", "Servicio",
  "Suministro", "Impuesto", "Seguro", "Otro",
];
const STATUSES = ["Pendiente", "Aplicado", "Pagado", "Cancelado"];

function fmtCurrency(n: number, currency = "USD") {
  if (currency === "RD$" || currency === "DOP") {
    return `RD$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-DO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function downloadChargesCSV(charges: Charge[], properties: Property[], owners: Owner[]) {
  const headers = [
    "Fecha", "Propiedad", "Propietario", "Categoría", "Descripción",
    "Moneda", "Monto", "Tasa cambio", "Monto USD", "Estado", "Notas",
  ];
  const rows = charges.map((c) => {
    const prop = properties.find((p) => p.id === c.property_id);
    const own = owners.find((o) => o.id === c.owner_id);
    return [
      c.date, prop?.name ?? "", own?.full_name ?? "",
      c.category, c.description, c.currency,
      c.amount, c.exchange_rate, c.amount_usd,
      c.status, c.notes ?? "",
    ];
  });
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cargos_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Item row for the form ────────────────────────────────────────────────────
interface ItemDraft {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

function emptyItem(): ItemDraft {
  return { description: "", quantity: 1, unit_price: 0, total: 0 };
}

// ── Charge form dialog ───────────────────────────────────────────────────────
function ChargeFormDialog({
  open, onClose, editing, properties, owners,
}: {
  open: boolean;
  onClose: () => void;
  editing: Charge | null;
  properties: Property[];
  owners: Owner[];
}) {
  const create = useCreateCharge();
  const update = useUpdateCharge();
  const { data: existingItems } = useChargeItems(editing?.id ?? null);

  const [propertyId, setPropertyId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [category, setCategory] = useState("Otro");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("Pendiente");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [showItems, setShowItems] = useState(false);

  const amountUsd = currency === "USD" ? amount : +(amount / exchangeRate).toFixed(2);

  useEffect(() => {
    if (editing) {
      setPropertyId(editing.property_id ?? "");
      setOwnerId(editing.owner_id ?? "");
      setCategory(editing.category);
      setDescription(editing.description);
      setCurrency(editing.currency);
      setAmount(editing.amount);
      setExchangeRate(editing.exchange_rate);
      setDate(editing.date);
      setStatus(editing.status);
      setNotes(editing.notes ?? "");
      setShowItems(true);
    } else {
      setPropertyId(properties[0]?.id ?? "");
      setOwnerId("");
      setCategory("Otro");
      setDescription("");
      setCurrency("USD");
      setAmount(0);
      setExchangeRate(1);
      setDate(new Date().toISOString().slice(0, 10));
      setStatus("Pendiente");
      setNotes("");
      setItems([]);
      setShowItems(false);
    }
  }, [editing, properties]);

  useEffect(() => {
    if (existingItems && existingItems.length > 0) {
      setItems(
        existingItems.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total: it.total,
        }))
      );
      setShowItems(true);
    }
  }, [existingItems]);

  useEffect(() => {
    if (propertyId) {
      const prop = properties.find((p) => p.id === propertyId);
      if (prop?.owner_id) setOwnerId(prop.owner_id);
    }
  }, [propertyId, properties]);

  const itemsTotal = items.reduce((s, it) => s + it.total, 0);

  useEffect(() => {
    if (items.length > 0) setAmount(itemsTotal);
  }, [itemsTotal, items.length]);

  function updateItem(idx: number, field: keyof ItemDraft, value: string | number) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, [field]: value };
        if (field === "quantity" || field === "unit_price") {
          next.total = +(next.quantity * next.unit_price).toFixed(2);
        }
        return next;
      })
    );
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!propertyId || !description.trim()) {
      toast({ title: "Completa los campos requeridos", variant: "destructive" });
      return;
    }
    const charge: ChargeInsert = {
      property_id: propertyId,
      owner_id: ownerId || null,
      charge_type: "propietario",
      category,
      description: description.trim(),
      currency,
      amount,
      exchange_rate: exchangeRate,
      amount_usd: amountUsd,
      date,
      status,
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
        toast({ title: "Cargo actualizado" });
      } else {
        await create.mutateAsync({ charge, items: cleanItems });
        toast({ title: "Cargo creado" });
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
          <DialogTitle>{editing ? "Editar cargo" : "Nuevo cargo"}</DialogTitle>
          <DialogDescription>
            {editing ? "Modifica los datos del cargo." : "Registra un nuevo cargo o deducción."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Row 1: property + owner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Propiedad *</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Propietario</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                <option value="">Sin asignar</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: category + date + status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción *</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Reparación aire acondicionado" />
          </div>

          {/* Currency row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Moneda</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="RD$">RD$</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Monto</label>
              <Input
                type="number" step="0.01" min="0"
                value={amount || ""}
                onChange={(e) => setAmount(+e.target.value)}
                disabled={items.length > 0}
              />
            </div>
            {currency !== "USD" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tasa cambio</label>
                <Input
                  type="number" step="0.01" min="0.01"
                  value={exchangeRate || ""}
                  onChange={(e) => setExchangeRate(+e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Equiv. USD</label>
              <div className="border rounded-md px-3 py-2 text-sm bg-gray-50 text-muted-foreground">
                {fmtCurrency(amountUsd)}
              </div>
            </div>
          </div>

          {/* Items section */}
          <div className="border rounded-lg p-3 space-y-3 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-medium text-[#0F2B4C] hover:underline"
                onClick={() => {
                  setShowItems(!showItems);
                  if (!showItems && items.length === 0) setItems([emptyItem()]);
                }}
              >
                <Package size={14} />
                Ítems detallados ({items.length})
                {showItems ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showItems && (
                <Button
                  type="button" variant="ghost" size="sm"
                  className="h-7 text-xs"
                  onClick={() => setItems([...items, emptyItem()])}
                >
                  <ListPlus size={13} className="mr-1" /> Agregar
                </Button>
              )}
            </div>

            {showItems && items.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_70px_90px_90px_32px] gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  <span>Descripción</span>
                  <span>Cant.</span>
                  <span>Precio U.</span>
                  <span>Total</span>
                  <span />
                </div>
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_70px_90px_90px_32px] gap-2 items-center">
                    <Input
                      value={it.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      placeholder="Descripción"
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number" step="0.01" min="0"
                      value={it.quantity || ""}
                      onChange={(e) => updateItem(idx, "quantity", +e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number" step="0.01" min="0"
                      value={it.unit_price || ""}
                      onChange={(e) => updateItem(idx, "unit_price", +e.target.value)}
                      className="h-8 text-sm"
                    />
                    <div className="h-8 flex items-center text-sm font-medium px-2 bg-white border rounded-md">
                      {fmtCurrency(it.total, currency)}
                    </div>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => removeItem(idx)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-end text-sm font-semibold pt-1 pr-12">
                  Total: {fmtCurrency(itemsTotal, currency)}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notas</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm bg-white resize-none"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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

// ── Expandable charge card ───────────────────────────────────────────────────
function ChargeCard({
  charge, property, owner, onEdit, onDelete,
}: {
  charge: Charge;
  property?: Property;
  owner?: Owner;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: items } = useChargeItems(expanded ? charge.id : null);

  const statusColor =
    charge.status === "Aplicado" ? "bg-blue-100 text-blue-700" :
    charge.status === "Pagado" ? "bg-green-100 text-green-700" :
    charge.status === "Cancelado" ? "bg-red-100 text-red-700" :
    "bg-yellow-100 text-yellow-700";

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm text-[#0F2B4C] truncate">
                {charge.description}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                {charge.status}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#0F2B4C]/10 text-[#0F2B4C]">
                {charge.category}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span>{fmtDate(charge.date)}</span>
              {property && (
                <span className="flex items-center gap-1">
                  <Building2 size={11} /> {property.name}
                </span>
              )}
              {owner && <span>→ {owner.full_name}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold text-sm text-[#0F2B4C]">
              {fmtCurrency(charge.amount, charge.currency)}
            </div>
            {charge.currency !== "USD" && (
              <div className="text-[10px] text-muted-foreground">
                ≈ {fmtCurrency(charge.amount_usd)} · TC {charge.exchange_rate}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-[#2D6A9F] hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            <Package size={12} />
            {expanded ? "Ocultar ítems" : "Ver ítems"}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 md:h-8 md:w-8" onClick={onEdit}>
              <Pencil size={15} />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 md:h-8 md:w-8 text-red-500 hover:text-red-700" onClick={onDelete}>
              <Trash2 size={15} />
            </Button>
          </div>
        </div>
      </div>

      {expanded && items && items.length > 0 && (
        <div className="border-t bg-gray-50/70 px-4 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="text-left pb-1">Descripción</th>
                <th className="text-right pb-1 w-16">Cant.</th>
                <th className="text-right pb-1 w-24">Precio U.</th>
                <th className="text-right pb-1 w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-gray-200">
                  <td className="py-1">{it.description}</td>
                  <td className="py-1 text-right">{it.quantity}</td>
                  <td className="py-1 text-right">{fmtCurrency(it.unit_price, charge.currency)}</td>
                  <td className="py-1 text-right font-medium">{fmtCurrency(it.total, charge.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {expanded && items && items.length === 0 && (
        <div className="border-t bg-gray-50/70 px-4 py-3 text-xs text-muted-foreground italic">
          Sin ítems detallados
        </div>
      )}

      {charge.notes && expanded && (
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          <strong>Notas:</strong> {charge.notes}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
const MONTHS = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function AdminCargos() {
  const now = new Date();
  const { data: charges = [], isLoading } = useCharges();
  const { data: properties = [] } = useProperties();
  const { data: owners = [] } = useOwners();
  const { selectedPropertyId, selectedProperty } = useProperty();
  const deleteCharge = useDeleteCharge();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Charge | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Charge | null>(null);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  }

  const propertyCharges = useMemo(() => {
    if (!selectedPropertyId) return charges;
    const ownerId = selectedProperty?.owner_id ?? "";
    return charges.filter(
      (c) => c.property_id === selectedPropertyId || (ownerId && c.owner_id === ownerId)
    );
  }, [charges, selectedPropertyId, selectedProperty]);

  const monthFiltered = useMemo(() => {
    return propertyCharges.filter((c) => {
      const d = new Date(c.date + "T12:00:00");
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
  }, [propertyCharges, month, year]);

  const filtered = useMemo(() => {
    if (!search.trim()) return monthFiltered;
    const q = search.toLowerCase();
    return monthFiltered.filter((c) => {
      const prop = properties.find((p) => p.id === c.property_id);
      const own = owners.find((o) => o.id === c.owner_id);
      return (
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        (prop?.name ?? "").toLowerCase().includes(q) ||
        (own?.full_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [monthFiltered, search, properties, owners]);

  const totalUsd = monthFiltered.reduce((s, c) => s + c.amount_usd, 0);
  const pendingCount = monthFiltered.filter((c) => c.status === "Pendiente").length;
  const pendingUsd = monthFiltered.filter((c) => c.status === "Pendiente").reduce((s, c) => s + c.amount_usd, 0);
  const appliedCount = monthFiltered.filter((c) => c.status !== "Pendiente").length;
  const appliedUsd = monthFiltered.filter((c) => c.status !== "Pendiente").reduce((s, c) => s + c.amount_usd, 0);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(c: Charge) {
    setEditing(c);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCharge.mutateAsync(deleteTarget.id);
      toast({ title: "Cargo eliminado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeleteTarget(null);
  }

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
    <div className="max-w-screen-2xl mx-auto space-y-4 text-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Receipt size={20} className="text-[#0F2B4C]" />
          <h1 className="text-xl font-bold text-[#0F2B4C]">Cargos Prop.</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadChargesCSV(monthFiltered, properties, owners)}>
            <Download size={14} className="mr-1" /> Exportar
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} className="mr-1" /> Nuevo cargo
          </Button>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-1 bg-[#0F2B4C]/5 rounded-xl px-4 py-2.5 mb-5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </Button>
        <span className="text-sm font-semibold text-[#0F2B4C] min-w-[130px] text-center">
          {MONTHS[month]} {year}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {([
          {
            label: "Cargos del mes", value: String(monthFiltered.length),
            sub: monthFiltered.length === 1 ? "cargo registrado" : "cargos registrados",
            Icon: Receipt, topCls: "bg-[#0F2B4C]", valCls: "text-[#0F2B4C]",
          },
          {
            label: "Total USD", value: fmtCurrency(totalUsd),
            sub: "monto agregado",
            Icon: DollarSign, topCls: "bg-[#2D6A9F]", valCls: "text-[#2D6A9F]",
          },
          {
            label: "Aplicados", value: String(appliedCount),
            sub: fmtCurrency(appliedUsd),
            Icon: CheckCircle2, topCls: "bg-emerald-600", valCls: "text-emerald-700",
          },
          {
            label: "Pendientes", value: String(pendingCount),
            sub: fmtCurrency(pendingUsd),
            Icon: Clock, topCls: "bg-amber-600", valCls: "text-amber-700",
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

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por descripción, categoría, propiedad…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
        {search && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
            <X size={14} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-[#2D6A9F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {search ? "Sin resultados para esta búsqueda." : "No hay cargos registrados aún."}
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {filtered.map((c) => (
            <ChargeCard
              key={c.id}
              charge={c}
              property={properties.find((p) => p.id === c.property_id)}
              owner={owners.find((o) => o.id === c.owner_id)}
              onEdit={() => openEdit(c)}
              onDelete={() => setDeleteTarget(c)}
            />
          ))}
        </div>
      )}

      {/* Form dialog */}
      <ChargeFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        editing={editing}
        properties={properties}
        owners={owners}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" /> Eliminar cargo
            </DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar "{deleteTarget?.description}"? Esta acción no se puede deshacer.
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
