import { useState, useEffect, useMemo } from "react";
import {
  UserCheck, Plus, Pencil, Trash2, Search, X,
  Phone, Mail, MapPin, CreditCard, FileText, Receipt, Clock,
  Building2, Users2, ChevronDown, ChevronUp,
  AlertTriangle, ShieldCheck, Download,
  ChevronLeft, ChevronRight, CalendarDays, KeyRound, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useOwners, useCreateOwner, useUpdateOwner, useDeleteOwner } from "@/hooks/useOwners";
import { useProperties } from "@/hooks/useProperties";
import { useAllReservationsGlobal } from "@/hooks/useReservations";
import { useCharges } from "@/hooks/useCharges";
import { useProperty } from "@/contexts/PropertyContext";
import type { Owner, OwnerInsert, Property, Reservation, Charge } from "@/types/database";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

function downloadOwnersCSV(owners: Owner[], properties: Property[]) {
  const headers = [
    "Nombre", "Copropietario", "Email", "Telefono",
    "Cedula/Pasaporte", "Nacionalidad", "Direccion",
    "Banco", "Cuenta", "Tipo cuenta",
    "Inicio contrato", "Fin contrato", "Observaciones",
    "Contacto emergencia", "Tel. emergencia",
    "Propiedades", "Notas", "Activo",
  ];
  const rows = owners.map((o) => {
    const props = properties.filter((p) => p.owner_id === o.id).map((p) => p.name).join("; ");
    return [
      o.full_name, o.co_owner_name ?? "", o.email ?? "", o.phone ?? "",
      o.cedula_pasaporte ?? "", o.nationality ?? "", o.address ?? "",
      o.bank_name ?? "", o.bank_account ?? "", o.bank_account_type ?? "",
      o.contract_start ?? "", o.contract_end ?? "", o.commission_notes ?? "",
      o.emergency_contact ?? "", o.emergency_phone ?? "",
      props, o.notes ?? "", o.active ? "Si" : "No",
    ];
  });
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `propietarios_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

function getQuarterLabel(q: number, y: number) {
  const names = ["Ene-Mar", "Abr-Jun", "Jul-Sep", "Oct-Dic"];
  return `${names[q]} ${y}`;
}

function getQuarterMonths(q: number): number[] {
  return [q * 3 + 1, q * 3 + 2, q * 3 + 3];
}

// ── Owner form dialog ─────────────────────────────────────────────────────────
// ── Multi-value field (emails, phones, banks) ─────────────────────────────────
function parseMulti(val: string | null): string[] {
  if (!val) return [""];
  try { const arr = JSON.parse(val); return Array.isArray(arr) && arr.length ? arr : [""]; }
  catch { return val ? [val] : [""]; }
}
function serializeMulti(arr: string[]): string | null {
  const clean = arr.filter((v) => v.trim());
  if (!clean.length) return null;
  if (clean.length === 1) return clean[0];
  return JSON.stringify(clean);
}

interface BankEntry { bank: string; account: string; type: string }
function parseBanks(name: string | null, account: string | null, type: string | null): BankEntry[] {
  try {
    const names = name ? JSON.parse(name) : null;
    const accounts = account ? JSON.parse(account) : null;
    const types = type ? JSON.parse(type) : null;
    if (Array.isArray(names)) {
      return names.map((n: string, i: number) => ({
        bank: n ?? "",
        account: accounts?.[i] ?? "",
        type: types?.[i] ?? "ahorro",
      }));
    }
  } catch { /* not JSON, single values */ }
  return [{ bank: name ?? "", account: account ?? "", type: type ?? "ahorro" }];
}
function serializeBanks(banks: BankEntry[]): { bank_name: string | null; bank_account: string | null; bank_account_type: string | null } {
  const clean = banks.filter((b) => b.bank.trim() || b.account.trim());
  if (!clean.length) return { bank_name: null, bank_account: null, bank_account_type: null };
  if (clean.length === 1) return { bank_name: clean[0].bank || null, bank_account: clean[0].account || null, bank_account_type: clean[0].type || "ahorro" };
  return {
    bank_name: JSON.stringify(clean.map((b) => b.bank)),
    bank_account: JSON.stringify(clean.map((b) => b.account)),
    bank_account_type: JSON.stringify(clean.map((b) => b.type)),
  };
}

function MultiInput({ label, values, onChange, type = "text", placeholder = "" }: {
  label: string; values: string[]; onChange: (v: string[]) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>
      {values.map((v, i) => (
        <div key={i} className="flex gap-1 mb-1">
          <Input
            type={type}
            placeholder={placeholder}
            value={v}
            onChange={(e) => { const n = [...values]; n[i] = e.target.value; onChange(n); }}
          />
          {values.length > 1 && (
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="px-2 text-red-400 hover:text-red-600 shrink-0"><X size={14} /></button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...values, ""])}
        className="text-[11px] text-[#0F2B4C] hover:underline flex items-center gap-1 mt-1">
        <Plus size={12} /> Agregar otro
      </button>
    </div>
  );
}

function OwnerFormDialog({
  open, onClose, onSave, editing,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: OwnerInsert) => void;
  editing: Owner | null;
}) {
  const [form, setForm] = useState<OwnerInsert>({
    full_name: "",
    co_owner_name: "",
    email: "",
    phone: "",
    cedula_pasaporte: "",
    nationality: "",
    address: "",
    bank_name: "",
    bank_account: "",
    bank_account_type: "ahorro",
    contract_start: null,
    contract_end: null,
    commission_notes: "",
    emergency_contact: "",
    emergency_phone: "",
    notes: "",
  });

  const [emails, setEmails] = useState<string[]>([""]);
  const [phones, setPhones] = useState<string[]>([""]);
  const [banks, setBanks] = useState<BankEntry[]>([{ bank: "", account: "", type: "ahorro" }]);

  useEffect(() => {
    if (editing) {
      setForm({
        full_name: editing.full_name,
        co_owner_name: editing.co_owner_name ?? "",
        email: editing.email,
        phone: editing.phone,
        cedula_pasaporte: editing.cedula_pasaporte ?? "",
        nationality: editing.nationality ?? "",
        address: editing.address ?? "",
        bank_name: editing.bank_name,
        bank_account: editing.bank_account,
        bank_account_type: editing.bank_account_type,
        contract_start: editing.contract_start,
        contract_end: editing.contract_end,
        commission_notes: editing.commission_notes ?? "",
        emergency_contact: editing.emergency_contact ?? "",
        emergency_phone: editing.emergency_phone ?? "",
        notes: editing.notes ?? "",
      });
      setEmails(parseMulti(editing.email));
      setPhones(parseMulti(editing.phone));
      setBanks(parseBanks(editing.bank_name, editing.bank_account, editing.bank_account_type));
    } else {
      setForm({
        full_name: "", co_owner_name: "", email: "", phone: "",
        cedula_pasaporte: "", nationality: "", address: "",
        bank_name: "", bank_account: "", bank_account_type: "ahorro",
        contract_start: null, contract_end: null, commission_notes: "",
        emergency_contact: "", emergency_phone: "", notes: "",
      });
      setEmails([""]);
      setPhones([""]);
      setBanks([{ bank: "", account: "", type: "ahorro" }]);
    }
  }, [editing]);

  if (!open) return null;

  const valid = form.full_name.trim().length > 0;

  function field(label: string, key: keyof OwnerInsert, type = "text", placeholder = "") {
    return (
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>
        <Input
          type={type}
          placeholder={placeholder}
          value={(form[key] as string) ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value || null }))}
        />
      </div>
    );
  }

  function handleSave() {
    const bankData = serializeBanks(banks);
    onSave({
      ...form,
      email: serializeMulti(emails),
      phone: serializeMulti(phones),
      ...bankData,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 mb-8 animate-in fade-in slide-in-from-top-4">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-serif font-semibold text-[#0F2B4C]">
            {editing ? "Editar propietario" : "Nuevo propietario"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Personal */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Users2 size={14} /> Datos personales
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field("Nombre completo *", "full_name", "text", "Nombre del titular")}
              {field("Copropietario", "co_owner_name", "text", "Nombre del copropietario")}
              <MultiInput label="Email" values={emails} onChange={setEmails} type="email" placeholder="correo@ejemplo.com" />
              <MultiInput label="Telefono" values={phones} onChange={setPhones} type="tel" placeholder="+1 809 000 0000" />
              {field("Cedula / Pasaporte", "cedula_pasaporte", "text", "000-0000000-0")}
              {field("Nacionalidad", "nationality", "text", "Dominicana")}
              {field("Direccion", "address", "text", "Calle, Ciudad, Pais")}
            </div>
          </div>

          {/* Banking */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <CreditCard size={14} /> Datos bancarios
            </h3>
            <div className="space-y-3">
              {banks.map((b, i) => (
                <div key={i} className="relative border rounded-lg p-3 bg-slate-50/50">
                  {banks.length > 1 && (
                    <button type="button" onClick={() => setBanks(banks.filter((_, j) => j !== i))}
                      className="absolute top-2 right-2 text-red-400 hover:text-red-600"><X size={14} /></button>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Banco</label>
                      <Input placeholder="Banreservas" value={b.bank}
                        onChange={(e) => { const n = [...banks]; n[i] = { ...b, bank: e.target.value }; setBanks(n); }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Numero de cuenta</label>
                      <Input placeholder="0000-0000-0000" value={b.account}
                        onChange={(e) => { const n = [...banks]; n[i] = { ...b, account: e.target.value }; setBanks(n); }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo de cuenta</label>
                      <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={b.type} onChange={(e) => { const n = [...banks]; n[i] = { ...b, type: e.target.value }; setBanks(n); }}>
                        <option value="ahorro">Ahorro</option>
                        <option value="corriente">Corriente</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setBanks([...banks, { bank: "", account: "", type: "ahorro" }])}
                className="text-[11px] text-[#0F2B4C] hover:underline flex items-center gap-1">
                <Plus size={12} /> Agregar otra cuenta
              </button>
            </div>
          </div>

          {/* Contract */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <FileText size={14} /> Contrato
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field("Inicio de contrato", "contract_start", "date")}
              {field("Fin de contrato", "contract_end", "date")}
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Observaciones</label>
              <textarea
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                placeholder="Observaciones del contrato o acuerdo..."
                value={form.commission_notes ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, commission_notes: e.target.value || null }))}
              />
            </div>
          </div>

          {/* Emergency */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <AlertTriangle size={14} /> Contacto de emergencia
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field("Nombre contacto", "emergency_contact", "text", "Nombre")}
              {field("Telefono emergencia", "emergency_phone", "tel", "+1 809 000 0000")}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Notas generales</label>
            <textarea
              className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
              placeholder="Notas adicionales..."
              value={form.notes ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value || null }))}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!valid}
            onClick={handleSave}
            className="bg-[#0F2B4C] hover:bg-[#0F2B4C]/90"
          >
            {editing ? "Guardar cambios" : "Registrar propietario"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Quarterly income widget ───────────────────────────────────────────────────
const MONTH_NAMES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function fmtShortDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-DO", {
    day: "2-digit", month: "short",
  });
}

function OwnerFinancials({
  ownerProperties,
  reservations,
  charges,
  ownerId,
  month,
  year,
  onPeriodChange,
  payoutRate,
}: {
  ownerProperties: Property[];
  reservations: Reservation[];
  charges: Charge[];
  ownerId: string;
  month: number;
  year: number;
  onPeriodChange: (m: number, y: number) => void;
  payoutRate: number;
}) {
  const [viewMode, setViewMode] = useState<"mes" | "trimestre">("mes");
  const [quarter, setQuarter] = useState(Math.floor((month - 1) / 3));
  const [showDetail, setShowDetail] = useState(false);

  const propertyIds = new Set(ownerProperties.map((p) => p.id));

  function prevPeriod() {
    if (viewMode === "mes") {
      const newMonth = month === 1 ? 12 : month - 1;
      const newYear = month === 1 ? year - 1 : year;
      onPeriodChange(newMonth, newYear);
    } else {
      if (quarter === 0) { setQuarter(3); onPeriodChange(month, year - 1); }
      else setQuarter(quarter - 1);
    }
  }
  function nextPeriod() {
    if (viewMode === "mes") {
      const newMonth = month === 12 ? 1 : month + 1;
      const newYear = month === 12 ? year + 1 : year;
      onPeriodChange(newMonth, newYear);
    } else {
      if (quarter === 3) { setQuarter(0); onPeriodChange(month, year + 1); }
      else setQuarter(quarter + 1);
    }
  }

  const periodLabel = viewMode === "mes"
    ? `${MONTH_NAMES[month]} ${year}`
    : `${getQuarterLabel(quarter, year)}`;

  const months = viewMode === "mes" ? [month] : getQuarterMonths(quarter);

  const toUSD = (r: Reservation, val: number) =>
    r.currency === "RD$" && r.exchange_rate > 0 ? val / r.exchange_rate : val;

  const filteredRes = useMemo(() => {
    return reservations.filter(
      (r) => propertyIds.has(r.property_id) && r.period_year === year && months.includes(r.period_month)
    );
  }, [reservations, propertyIds, year, months]);

  const confirmedRes = useMemo(() => filteredRes.filter((r) => r.status === "Completada" || r.status === "Confirmada"), [filteredRes]);
  const pendingRes = useMemo(() => filteredRes.filter((r) => r.status === "Pendiente"), [filteredRes]);

  const filteredCharges = useMemo(() => {
    return charges.filter((c) => {
      if (c.status !== "Aplicado" && c.status !== "Pagado") return false;
      if (c.owner_id !== ownerId && !propertyIds.has(c.property_id ?? "")) return false;
      const d = new Date(c.date + "T12:00:00");
      const m = d.getMonth() + 1;
      const cy = d.getFullYear();
      return cy === year && months.includes(m);
    });
  }, [charges, ownerId, propertyIds, year, months]);

  const gross = confirmedRes.reduce((s, r) => s + toUSD(r, r.gross_amount), 0);
  const ownerAmount = confirmedRes.reduce((s, r) => s + toUSD(r, r.owner_amount), 0);
  const ceAmount = confirmedRes.reduce((s, r) => s + toUSD(r, r.ce_amount), 0);
  const chargesTotal = filteredCharges.reduce((s, c) => s + c.amount_usd, 0);
  const netOwner = ownerAmount - chargesTotal;
  const nights = confirmedRes.reduce((s, r) => s + r.nights, 0);

  const projGross = pendingRes.reduce((s, r) => s + toUSD(r, r.gross_amount), 0);
  const projOwner = pendingRes.reduce((s, r) => s + toUSD(r, r.owner_amount), 0);
  const projNights = pendingRes.reduce((s, r) => s + r.nights, 0);

  const confirmedRDS = confirmedRes.filter((r) => r.currency === "RD$");
  const ownerAtPayout = payoutRate > 0
    ? confirmedRDS.reduce((s, r) => s + r.owner_amount / payoutRate, 0)
      + confirmedRes.filter((r) => r.currency !== "RD$").reduce((s, r) => s + r.owner_amount, 0)
    : ownerAmount;
  const payoutDiff = ownerAtPayout - ownerAmount;

  return (
    <div className="space-y-3">
      {/* Summary card */}
      <div className="bg-gradient-to-br from-[#0F2B4C] to-[#1a3d5c] rounded-xl p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex bg-white/10 rounded-lg overflow-hidden text-[10px]">
              <button className={`px-2.5 py-1 font-semibold ${viewMode === "mes" ? "bg-white/20 text-white" : "text-white/50"}`}
                onClick={() => setViewMode("mes")}>Mes</button>
              <button className={`px-2.5 py-1 font-semibold ${viewMode === "trimestre" ? "bg-white/20 text-white" : "text-white/50"}`}
                onClick={() => setViewMode("trimestre")}>Trimestre</button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevPeriod} className="p-1 hover:bg-white/10 rounded"><ChevronLeft size={14} /></button>
            <span className="text-xs font-medium min-w-[110px] text-center">{periodLabel}</span>
            <button onClick={nextPeriod} className="p-1 hover:bg-white/10 rounded"><ChevronRight size={14} /></button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-[10px] text-white/50 uppercase">Bruto</p>
            <p className="text-sm sm:text-base font-bold font-serif">{fmtCurrency(gross)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/50 uppercase">Propietario</p>
            <p className="text-sm sm:text-base font-bold font-serif text-emerald-300">{fmtCurrency(ownerAmount)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/50 uppercase">Cargos</p>
            <p className="text-sm sm:text-base font-bold font-serif text-red-300">−{fmtCurrency(chargesTotal)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/50 uppercase">Neto a pagar</p>
            <p className={`text-sm sm:text-base font-bold font-serif ${netOwner >= 0 ? "text-emerald-200" : "text-red-300"}`}>
              {fmtCurrency(netOwner)}
            </p>
          </div>
        </div>
        {payoutRate > 0 && confirmedRDS.length > 0 && (
          <div className="mt-3 pt-2 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
              <span className="text-white/50 uppercase font-semibold">Tasa: RD${payoutRate}</span>
              <span className="text-white/70">Prop: <span className="font-mono font-semibold text-white">{fmtCurrency(ownerAtPayout)}</span></span>
              {payoutDiff !== 0 && (
                <span className={`font-mono font-semibold ${payoutDiff >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {payoutDiff >= 0 ? "+" : ""}{fmtCurrency(payoutDiff)}
                </span>
              )}
            </div>
          </div>
        )}
        {pendingRes.length > 0 && (
          <div className="mt-3 pt-2 border-t border-white/10">
            <p className="text-[10px] text-amber-300 uppercase font-semibold mb-1">Proyección (pendientes)</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-white/60">
              <span>{pendingRes.length} reservas · {projNights} noches</span>
              <span>Bruto: {fmtCurrency(projGross)}</span>
              <span className="text-amber-200 font-medium">Prop: {fmtCurrency(projOwner)}</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
          <p className="text-[10px] text-white/40">
            {confirmedRes.length} confirmadas · {nights} noches · CE: {fmtCurrency(ceAmount)}
          </p>
          <button
            className="flex items-center gap-1 text-[10px] font-semibold text-white/60 hover:text-white transition-colors"
            onClick={() => setShowDetail(!showDetail)}
          >
            <CalendarDays size={12} />
            {showDetail ? "Ocultar desglose" : "Ver desglose"}
          </button>
        </div>
      </div>

      {/* Detailed breakdown */}
      {showDetail && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b">
            <p className="text-[10px] font-bold text-[#0F2B4C] uppercase tracking-widest">
              Desglose — {periodLabel}
            </p>
          </div>

          {/* Confirmed Reservations */}
          <div className="px-3 sm:px-4 py-2 border-b">
            <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-1">
              Confirmadas ({confirmedRes.length})
            </p>
            {confirmedRes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1">Sin reservas confirmadas</p>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase">
                    <th className="text-left py-1 font-semibold">Huésped</th>
                    <th className="text-left py-1 font-semibold">Fechas</th>
                    <th className="text-left py-1 font-semibold">Plataforma</th>
                    <th className="text-right py-1 font-semibold">Bruto USD</th>
                    <th className="text-right py-1 font-semibold">Propietario USD</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmedRes.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="py-1 font-medium">{r.guest_name}</td>
                      <td className="py-1 text-muted-foreground">{fmtShortDate(r.checkin)} – {fmtShortDate(r.checkout)}</td>
                      <td className="py-1">
                        <span className="px-1.5 py-0.5 rounded bg-[#0F2B4C]/10 text-[10px]">{r.platform}</span>
                        {r.currency === "RD$" && <span className="ml-1 px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px]">RD$</span>}
                      </td>
                      <td className="py-1 text-right">{fmtCurrency(toUSD(r, r.gross_amount))}</td>
                      <td className="py-1 text-right font-medium text-green-700">{fmtCurrency(toUSD(r, r.owner_amount))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td colSpan={3} className="py-1">Total confirmado</td>
                    <td className="py-1 text-right">{fmtCurrency(gross)}</td>
                    <td className="py-1 text-right text-green-700">{fmtCurrency(ownerAmount)}</td>
                  </tr>
                </tfoot>
              </table>
              </div>
            )}
          </div>

          {/* Pending Reservations (Projections) */}
          {pendingRes.length > 0 && (
            <div className="px-3 sm:px-4 py-2 border-b bg-amber-50/50">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">
                Proyecciones — Pendientes ({pendingRes.length})
              </p>
              <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase">
                    <th className="text-left py-1 font-semibold">Huésped</th>
                    <th className="text-left py-1 font-semibold">Fechas</th>
                    <th className="text-left py-1 font-semibold">Plataforma</th>
                    <th className="text-right py-1 font-semibold">Bruto USD</th>
                    <th className="text-right py-1 font-semibold">Propietario USD</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRes.map((r) => (
                    <tr key={r.id} className="border-t border-amber-100">
                      <td className="py-1 font-medium text-amber-800">{r.guest_name}</td>
                      <td className="py-1 text-muted-foreground">{fmtShortDate(r.checkin)} – {fmtShortDate(r.checkout)}</td>
                      <td className="py-1">
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-[10px] text-amber-700">{r.platform}</span>
                        {r.currency === "RD$" && <span className="ml-1 px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px]">RD$</span>}
                      </td>
                      <td className="py-1 text-right text-amber-700">{fmtCurrency(toUSD(r, r.gross_amount))}</td>
                      <td className="py-1 text-right font-medium text-amber-700">{fmtCurrency(toUSD(r, r.owner_amount))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold text-amber-800">
                    <td colSpan={3} className="py-1">Proyección si se confirman</td>
                    <td className="py-1 text-right">{fmtCurrency(projGross)}</td>
                    <td className="py-1 text-right">{fmtCurrency(projOwner)}</td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>
          )}

          {/* Charges */}
          <div className="px-3 sm:px-4 py-2 border-b">
            <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1">
              Cargos aplicados ({filteredCharges.length})
            </p>
            {filteredCharges.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1">Sin cargos</p>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <table className="w-full text-xs min-w-[420px]">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase">
                    <th className="text-left py-1 font-semibold">Descripción</th>
                    <th className="text-left py-1 font-semibold">Categoría</th>
                    <th className="text-left py-1 font-semibold">Fecha</th>
                    <th className="text-right py-1 font-semibold">Monto USD</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCharges.map((c) => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="py-1 font-medium">{c.description}</td>
                      <td className="py-1">
                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px]">{c.category}</span>
                      </td>
                      <td className="py-1 text-muted-foreground">{fmtShortDate(c.date)}</td>
                      <td className="py-1 text-right font-medium text-red-600">−{fmtCurrency(c.amount_usd)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td colSpan={3} className="py-1">Total cargos</td>
                    <td className="py-1 text-right text-red-600">−{fmtCurrency(chargesTotal)}</td>
                  </tr>
                </tfoot>
              </table>
              </div>
            )}
          </div>

          {/* Net summary */}
          <div className={`px-3 sm:px-4 py-3 ${netOwner >= 0 ? "bg-green-50" : "bg-red-50"}`}>
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
              <span className="text-[#0F2B4C]">Neto a pagar (confirmado)</span>
              <span className={netOwner >= 0 ? "text-green-700" : "text-red-700"}>{fmtCurrency(netOwner)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {fmtCurrency(ownerAmount)} ingreso confirmado − {fmtCurrency(chargesTotal)} cargos = {fmtCurrency(netOwner)}
            </p>
            {pendingRes.length > 0 && (
              <p className="text-[10px] text-amber-600 mt-1">
                Si se confirman pendientes: {fmtCurrency(netOwner + projOwner)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reset password dialog ────────────────────────────────────────────────────
function ResetPasswordDialog({
  open,
  onClose,
  ownerName,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  ownerName: string;
  userId: string;
}) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setPw(""); setConfirm(""); setError(null); }
  }, [open]);

  async function handleReset() {
    if (pw.length < 8) { setError("Mínimo 8 caracteres"); return; }
    if (pw !== confirm) { setError("Las contraseñas no coinciden"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await supabase.functions.invoke("reset-guest-password", {
        body: { user_id: userId, new_password: pw },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Contraseña actualizada", description: `Se actualizó la contraseña de ${ownerName}` });
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={16} />
            Resetear contraseña
          </DialogTitle>
          <DialogDescription>
            Nueva contraseña para <strong>{ownerName}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Nueva contraseña</label>
            <Input type="password" placeholder="Mínimo 8 caracteres" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Confirmar contraseña</label>
            <Input type="password" placeholder="Repite la contraseña" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleReset} disabled={loading} className="bg-[#0F2B4C] hover:bg-[#0F2B4C]/90">
            {loading ? <><Loader2 size={14} className="mr-2 animate-spin" />Guardando...</> : "Actualizar contraseña"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Owner card ────────────────────────────────────────────────────────────────
function OwnerCard({
  owner,
  properties,
  reservations,
  charges,
  selectedPropertyId,
  onEdit,
  onDelete,
}: {
  owner: Owner;
  properties: Property[];
  reservations: Reservation[];
  charges: Charge[];
  selectedPropertyId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const ownerProps = properties.filter((p) => p.owner_id === owner.id);
  const isActiveOwner = ownerProps.some((p) => p.id === selectedPropertyId);
  const guestUserId = ownerProps.find((p) => p.owner_profile_id)?.owner_profile_id ?? null;

  const now = new Date();
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());

  const allOwnerCharges = charges.filter(
    (c) => c.status !== "Cancelado" && (c.owner_id === owner.id || ownerProps.some((p) => p.id === c.property_id))
  );
  const appliedCharges = allOwnerCharges.filter((c) => {
    if (c.status !== "Aplicado" && c.status !== "Pagado") return false;
    const d = new Date(c.date + "T12:00:00");
    return d.getMonth() + 1 === periodMonth && d.getFullYear() === periodYear;
  });
  const pendingCharges = allOwnerCharges.filter((c) => c.status === "Pendiente");
  const totalChargesUsd = appliedCharges.reduce((s, c) => s + c.amount_usd, 0);
  const pendingChargesUsd = pendingCharges.reduce((s, c) => s + c.amount_usd, 0);

  const ownerPropIds = new Set(ownerProps.map((p) => p.id));
  const ownerReservations = reservations.filter((r) => ownerPropIds.has(r.property_id) && (r.status === "Completada" || r.status === "Confirmada"));
  const toUSD = (r: Reservation, val: number) =>
    r.currency === "RD$" && r.exchange_rate > 0 ? val / r.exchange_rate : val;
  const totalOwnerIncomeUsd = ownerReservations.reduce((s, r) => s + toUSD(r, r.owner_amount), 0);
  const netAfterCharges = totalOwnerIncomeUsd - totalChargesUsd;

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isActiveOwner ? "ring-2 ring-[#0F2B4C]/40 border-[#0F2B4C]/30" : ""}`}>
      {/* Header */}
      <div
        className="px-3 sm:px-5 py-3 sm:py-4 flex items-start justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
          <div className={`flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full shrink-0 ${isActiveOwner ? "bg-[#0F2B4C] text-white" : "bg-[#0F2B4C]/10"}`}>
            <UserCheck size={16} className={`sm:w-[18px] sm:h-[18px] ${isActiveOwner ? "text-white" : "text-[#0F2B4C]"}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif font-semibold text-[#0F2B4C] text-sm sm:text-base truncate">{owner.full_name}</h3>
              {!expanded && ownerProps.length > 0 && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isActiveOwner ? "bg-[#0F2B4C] text-white" : "bg-[#0F2B4C]/10 text-[#0F2B4C]"}`}>
                  <Building2 size={10} />{ownerProps.map((p) => p.name).join(", ")}
                  {isActiveOwner && <span className="ml-1 text-[9px] opacity-80">● Activa</span>}
                </span>
              )}
            </div>
            {owner.co_owner_name && (
              <p className="text-xs text-slate-500">Copropietario: {owner.co_owner_name}</p>
            )}
            {!expanded && (
              <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 mt-1.5 sm:mt-2 text-[11px] sm:text-xs">
                <span className="flex items-center gap-1 text-slate-500">
                  <CalendarDays size={11} />{ownerReservations.length} reservas
                </span>
                <span className="flex items-center gap-1 text-green-700 font-medium">
                  <span className="hidden sm:inline">Ingreso:</span> {fmtCurrency(totalOwnerIncomeUsd)}
                </span>
                {totalChargesUsd > 0 && (
                  <span className="flex items-center gap-1 text-red-500 font-medium">
                    <span className="hidden sm:inline">Cargos:</span>
                    <span className="sm:hidden">−</span>
                    {fmtCurrency(totalChargesUsd)}
                  </span>
                )}
                {pendingChargesUsd > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    Pend: {fmtCurrency(pendingChargesUsd)}
                  </span>
                )}
                <span className={`flex items-center gap-1 font-semibold ${netAfterCharges >= 0 ? "text-[#0F2B4C]" : "text-red-600"}`}>
                  Neto: {fmtCurrency(netAfterCharges)}
                </span>
              </div>
            )}
            {expanded && (
              <>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
                  {owner.phone && parseMulti(owner.phone).map((p, i) => (
                    <span key={i} className="flex items-center gap-1"><Phone size={11} />{p}</span>
                  ))}
                  {owner.email && parseMulti(owner.email).map((e, i) => (
                    <span key={i} className="flex items-center gap-1"><Mail size={11} />{e}</span>
                  ))}
                  {owner.address && <span className="flex items-center gap-1"><MapPin size={11} />{owner.address}</span>}
                </div>
                {ownerProps.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ownerProps.map((p) => (
                      <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0F2B4C]/10 text-[#0F2B4C]">
                        <Building2 size={10} />{p.name}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {guestUserId && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setResetPwOpen(true); }} className="h-8 w-8 p-0" title="Resetear contraseña">
              <KeyRound size={14} className="text-amber-500" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="h-8 w-8 p-0">
            <Pencil size={14} className="text-slate-500" />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="h-8 w-8 p-0">
            <Trash2 size={14} className="text-red-400" />
          </Button>
          <div className="h-8 w-8 flex items-center justify-center">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 sm:px-5 pb-4 space-y-4 border-t pt-4">
          {/* Quarterly income */}
          {ownerProps.length > 0 && (
            <OwnerFinancials
              ownerProperties={ownerProps}
              reservations={reservations}
              charges={charges}
              ownerId={owner.id}
              month={periodMonth}
              year={periodYear}
              onPeriodChange={(m, y) => { setPeriodMonth(m); setPeriodYear(y); }}
              payoutRate={ownerProps.find((p) => p.id === selectedPropertyId)?.reference_rate ?? ownerProps[0]?.reference_rate ?? 0}
            />
          )}

          {/* Charges summary */}
          {(appliedCharges.length > 0 || pendingCharges.length > 0) && (
            <div className="rounded-xl border overflow-hidden">
              {/* Applied/Paid charges - current month */}
              {appliedCharges.length > 0 && (
                <div className="bg-red-50 p-3 border-b border-red-100">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Receipt size={12} /> Cargos aplicados — {MONTH_NAMES[periodMonth]} {periodYear} ({appliedCharges.length})
                  </p>
                  <div className="space-y-1.5 sm:space-y-1">
                    {appliedCharges.slice(0, 5).map((c) => (
                      <div key={c.id} className="flex items-start sm:items-center justify-between text-xs gap-2">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 min-w-0">
                          <span className="text-muted-foreground text-[10px]">{fmtShortDate(c.date)}</span>
                          <span className="text-red-700 truncate">{c.description}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-500">{c.category}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${c.status === "Pagado" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                            {c.status}
                          </span>
                        </div>
                        <span className="font-semibold text-red-700 shrink-0">−{fmtCurrency(c.amount_usd)}</span>
                      </div>
                    ))}
                    {appliedCharges.length > 5 && (
                      <p className="text-[10px] text-red-400 italic">+{appliedCharges.length - 5} cargos más</p>
                    )}
                  </div>
                  <div className="border-t border-red-200 mt-2 pt-2 flex justify-between text-xs font-semibold">
                    <span className="text-red-700">Total aplicados</span>
                    <span className="text-red-700">−{fmtCurrency(totalChargesUsd)}</span>
                  </div>
                </div>
              )}

              {/* Pending charges */}
              {pendingCharges.length > 0 && (
                <div className="bg-amber-50 p-3">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Clock size={12} /> Cargos pendientes ({pendingCharges.length})
                  </p>
                  <div className="space-y-1.5 sm:space-y-1">
                    {pendingCharges.slice(0, 5).map((c) => (
                      <div key={c.id} className="flex items-start sm:items-center justify-between text-xs gap-2">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 min-w-0">
                          <span className="text-muted-foreground text-[10px]">{fmtShortDate(c.date)}</span>
                          <span className="text-amber-800 truncate">{c.description}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">{c.category}</span>
                        </div>
                        <span className="font-semibold text-amber-700 shrink-0">−{fmtCurrency(c.amount_usd)}</span>
                      </div>
                    ))}
                    {pendingCharges.length > 5 && (
                      <p className="text-[10px] text-amber-500 italic">+{pendingCharges.length - 5} cargos más</p>
                    )}
                  </div>
                  <div className="border-t border-amber-200 mt-2 pt-2 flex justify-between text-xs font-semibold">
                    <span className="text-amber-700">Total pendientes</span>
                    <span className="text-amber-700">−{fmtCurrency(pendingChargesUsd)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {/* Banking */}
            {(owner.bank_name || owner.bank_account) && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <CreditCard size={12} /> Datos bancarios
                </p>
                {parseBanks(owner.bank_name, owner.bank_account, owner.bank_account_type).map((b, i) => (
                  <div key={i} className={i > 0 ? "mt-2 pt-2 border-t border-slate-200" : ""}>
                    {b.bank && <p className="text-slate-700">{b.bank}</p>}
                    {b.account && <p className="text-slate-600 text-xs">Cuenta: {b.account}</p>}
                    {b.type && <p className="text-slate-500 text-xs capitalize">Tipo: {b.type}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* ID */}
            {(owner.cedula_pasaporte || owner.nationality) && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <ShieldCheck size={12} /> Identificacion
                </p>
                {owner.cedula_pasaporte && <p className="text-slate-700">{owner.cedula_pasaporte}</p>}
                {owner.nationality && <p className="text-slate-500 text-xs">Nacionalidad: {owner.nationality}</p>}
              </div>
            )}

            {/* Contract */}
            {(owner.contract_start || owner.contract_end) && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <FileText size={12} /> Contrato
                </p>
                {owner.contract_start && <p className="text-slate-600 text-xs">Inicio: {owner.contract_start}</p>}
                {owner.contract_end && <p className="text-slate-600 text-xs">Fin: {owner.contract_end}</p>}
                {owner.commission_notes && <p className="text-slate-500 text-xs mt-1">{owner.commission_notes}</p>}
              </div>
            )}

            {/* Emergency */}
            {(owner.emergency_contact || owner.emergency_phone) && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <AlertTriangle size={12} /> Emergencia
                </p>
                {owner.emergency_contact && <p className="text-slate-700">{owner.emergency_contact}</p>}
                {owner.emergency_phone && <p className="text-slate-600 text-xs">{owner.emergency_phone}</p>}
              </div>
            )}
          </div>

          {owner.notes && (
            <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-900">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Notas</p>
              {owner.notes}
            </div>
          )}
        </div>
      )}

      {guestUserId && (
        <ResetPasswordDialog
          open={resetPwOpen}
          onClose={() => setResetPwOpen(false)}
          ownerName={owner.full_name}
          userId={guestUserId}
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminPropietarios() {
  const { data: owners = [], isLoading } = useOwners();
  const { data: properties = [] } = useProperties();
  const { data: reservations = [] } = useAllReservationsGlobal();
  const { data: propCharges = [] } = useCharges("propietario");
  const { selectedPropertyId } = useProperty();
  const createOwner = useCreateOwner();
  const updateOwner = useUpdateOwner();
  const deleteOwner = useDeleteOwner();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Owner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Owner | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return owners;
    const q = search.toLowerCase();
    return owners.filter(
      (o) =>
        o.full_name.toLowerCase().includes(q) ||
        (o.co_owner_name ?? "").toLowerCase().includes(q) ||
        (o.email ?? "").toLowerCase().includes(q) ||
        (o.phone ?? "").includes(q)
    );
  }, [owners, search]);

  function handleSave(data: OwnerInsert) {
    if (editing) {
      updateOwner.mutate(
        { id: editing.id, ...data },
        {
          onSuccess: () => {
            toast({ title: "Propietario actualizado" });
            setDialogOpen(false);
            setEditing(null);
          },
          onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        }
      );
    } else {
      createOwner.mutate(data, {
        onSuccess: () => {
          toast({ title: "Propietario registrado" });
          setDialogOpen(false);
        },
        onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteOwner.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: "Propietario eliminado" });
        setDeleteTarget(null);
      },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  const activeCount = owners.filter((o) => o.active).length;
  const withProperties = owners.filter((o) => properties.some((p) => p.owner_id === o.id)).length;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8] text-sm">
    <div className="max-w-screen-2xl w-full mx-auto">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#0F2B4C]">Propietarios</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Gestiona los propietarios de las propiedades</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-white/80 border-white shadow-sm text-xs sm:text-sm"
            onClick={() => downloadOwnersCSV(owners, properties)}
            disabled={owners.length === 0}
          >
            <Download size={13} />
            <span className="hidden sm:inline">Exportar CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            className="bg-[#0F2B4C] hover:bg-[#0F2B4C]/90 text-xs sm:text-sm"
          >
            <Plus size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo propietario</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 sm:px-6 grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
        {([
          { label: "Total", value: String(owners.length), sub: owners.length === 1 ? "propietario" : "propietarios",
            Icon: Users2, topCls: "bg-[#0F2B4C]", valCls: "text-[#0F2B4C]" },
          { label: "Activos", value: String(activeCount), sub: "en operación",
            Icon: UserCheck, topCls: "bg-emerald-600", valCls: "text-emerald-700" },
          { label: "Con propiedad", value: String(withProperties), sub: "asignados",
            Icon: Building2, topCls: "bg-amber-600", valCls: "text-amber-700" },
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
      <div className="px-4 sm:px-6 mb-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar propietario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/80 border-white shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="px-4 sm:px-6 pb-6">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-white/60 flex items-center justify-center">
                <Users2 size={28} className="text-slate-300" />
              </div>
            </div>
            <p className="text-slate-500 font-medium">
              {search ? "No se encontraron propietarios" : "No hay propietarios registrados"}
            </p>
            {!search && (
              <Button
                variant="outline"
                className="mt-4 bg-white/80"
                onClick={() => { setEditing(null); setDialogOpen(true); }}
              >
                <Plus size={14} className="mr-2" /> Registrar primer propietario
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((owner) => (
              <OwnerCard
                key={owner.id}
                owner={owner}
                properties={properties}
                reservations={reservations}
                charges={propCharges}
                selectedPropertyId={selectedPropertyId}
                onEdit={() => { setEditing(owner); setDialogOpen(true); }}
                onDelete={() => setDeleteTarget(owner)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form dialog */}
      <OwnerFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSave={handleSave}
        editing={editing}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar propietario</DialogTitle>
            <DialogDescription>
              Se eliminara a <strong>{deleteTarget?.full_name}</strong>. Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
