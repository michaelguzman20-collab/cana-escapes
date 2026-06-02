import { useState, useMemo, useEffect, useRef } from "react";
import {
  Wrench, Plus, Calendar, CalendarDays, List, Clock, CheckCircle2, AlertTriangle,
  Trash2, Edit3, ChevronLeft, ChevronRight, RotateCcw, Phone, User,
  Filter, X, Download, Building2, TrendingUp, UserCheck, Shield, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useProperties } from "@/hooks/useProperties";
import { useProperty } from "@/contexts/PropertyContext";
import { useOwners } from "@/hooks/useOwners";
import { useAllReservationsGlobal } from "@/hooks/useReservations";
import {
  useMaintenanceTickets, useCreateMaintenanceTicket,
  useUpdateMaintenanceTicket, useDeleteMaintenanceTicket,
  useMaintenanceSchedules, useCreateMaintenanceSchedule,
  useUpdateMaintenanceSchedule, useDeleteMaintenanceSchedule,
  useSyncTicketToCharge,
} from "@/hooks/useMaintenance";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { MaintenanceTicket, MaintenanceSchedule, Property, Reservation } from "@/types/database";

const CATEGORIAS = [
  "Aire Acondicionado", "Plomería", "Electricidad", "Piscina",
  "Limpieza Profunda", "Pintura", "Cerrajería", "Electrodomésticos",
  "Jardinería", "Fumigación", "Otro",
];

const PRIORIDADES = ["Baja", "Media", "Alta", "Urgente"] as const;
const ESTADOS = ["Pendiente", "En Progreso", "Resuelto", "Cancelado"] as const;

const PRIORIDAD_COLOR: Record<string, string> = {
  Baja: "bg-slate-100 text-slate-700 border-slate-200",
  Media: "bg-blue-50 text-blue-700 border-blue-200",
  Alta: "bg-amber-50 text-amber-700 border-amber-200",
  Urgente: "bg-red-50 text-red-700 border-red-200",
};

const ESTADO_COLOR: Record<string, string> = {
  Pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  "En Progreso": "bg-blue-50 text-blue-700 border-blue-200",
  Resuelto: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelado: "bg-slate-100 text-slate-500 border-slate-200",
};

const ESTADO_ICON: Record<string, React.ElementType> = {
  Pendiente: Clock,
  "En Progreso": RotateCcw,
  Resuelto: CheckCircle2,
  Cancelado: X,
};

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const PRIORIDAD_WEIGHT: Record<string, number> = { Urgente: 0, Alta: 1, Media: 2, Baja: 3 };
const ESTADO_WEIGHT: Record<string, number> = { "En Progreso": 0, Pendiente: 1, Resuelto: 2, Cancelado: 3 };

const ASIGNACION_OPTIONS = [
  { value: "propietario", label: "Cargo al Propietario", icon: UserCheck, color: "text-amber-700 bg-amber-50 border-amber-200" },
  { value: "cana_escapes", label: "Gasto Cana Escapes", icon: TrendingUp, color: "text-blue-700 bg-blue-50 border-blue-200" },
  { value: "incluido", label: "Incluido (sin cargo)", icon: Shield, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
] as const;

function fmtCurrency(n: number, cur: string) {
  if (cur === "DOP") return `RD$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function daysUntilBadge(days: number | null) {
  if (days === null) return null;
  if (days < 0) return (
    <Badge variant="outline" className="text-[10px] px-1.5 bg-red-50 text-red-700 border-red-200 gap-1 shrink-0">
      <AlertTriangle size={9} /> Vencido hace {Math.abs(days)}d
    </Badge>
  );
  if (days === 0) return (
    <Badge variant="outline" className="text-[10px] px-1.5 bg-red-50 text-red-700 border-red-200 gap-1 animate-pulse shrink-0">
      <Clock size={9} /> Hoy
    </Badge>
  );
  if (days <= 3) return (
    <Badge variant="outline" className="text-[10px] px-1.5 bg-amber-50 text-amber-700 border-amber-200 gap-1 shrink-0">
      <Clock size={9} /> En {days}d
    </Badge>
  );
  if (days <= 7) return (
    <Badge variant="outline" className="text-[10px] px-1.5 bg-blue-50 text-blue-700 border-blue-200 gap-1 shrink-0">
      <Clock size={9} /> En {days}d
    </Badge>
  );
  return null;
}

// ── CSV Export ──────────────────────────────────────────────────
function downloadTicketsCSV(
  tickets: MaintenanceTicket[],
  properties: { id: string; name: string }[],
) {
  const propName = (id: string) => properties.find((p) => p.id === id)?.name ?? "";
  const headers = [
    "Propiedad", "Categoría", "Prioridad", "Estado", "Título", "Descripción",
    "Técnico", "Teléfono", "Costo Estimado", "Costo Real", "Moneda",
    "Fecha Reporte", "Fecha Programada", "Fecha Resuelto", "Notas",
  ];
  const rows = tickets.map((t) => [
    propName(t.property_id), t.categoria, t.prioridad, t.estado, t.titulo,
    t.descripcion ?? "", t.tecnico_nombre ?? "", t.tecnico_telefono ?? "",
    t.costo_estimado, t.costo_real, t.currency,
    t.fecha_reporte, t.fecha_programada ?? "", t.fecha_resuelto ?? "", t.notas ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mantenimiento_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadSchedulesCSV(
  schedules: MaintenanceSchedule[],
  properties: { id: string; name: string }[],
) {
  const propName = (id: string) => properties.find((p) => p.id === id)?.name ?? "";
  const headers = [
    "Propiedad", "Categoría", "Título", "Descripción", "Técnico", "Teléfono",
    "Frecuencia (días)", "Costo Estimado", "Moneda",
    "Última Ejecución", "Próxima Ejecución", "Activo", "Notas",
  ];
  const rows = schedules.map((s) => [
    propName(s.property_id), s.categoria, s.titulo, s.descripcion ?? "",
    s.tecnico_nombre ?? "", s.tecnico_telefono ?? "",
    s.frecuencia_dias, s.costo_estimado, s.currency,
    s.ultima_ejecucion ?? "", s.proxima_ejecucion ?? "",
    s.activo ? "Sí" : "No", s.notas ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mantenimiento_preventivo_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Ticket Form Dialog ──────────────────────────────────────────
function TicketFormDialog({
  open, onOpenChange, editing, propertyId, properties, onSave, saving, defaultDate, reservations,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: MaintenanceTicket | null;
  propertyId: string;
  properties: { id: string; name: string }[];
  onSave: (data: any) => void;
  saving: boolean;
  defaultDate?: string;
  reservations?: Reservation[];
}) {
  const defaultPropId = propertyId || properties[0]?.id || "";

  function makeForm(ticket: MaintenanceTicket | null, propId: string) {
    return {
      property_id: ticket?.property_id ?? propId,
      categoria: ticket?.categoria ?? "Otro",
      prioridad: ticket?.prioridad ?? "Media",
      estado: ticket?.estado ?? "Pendiente",
      titulo: ticket?.titulo ?? "",
      descripcion: ticket?.descripcion ?? "",
      tecnico_nombre: ticket?.tecnico_nombre ?? "",
      tecnico_telefono: ticket?.tecnico_telefono ?? "",
      costo_estimado: ticket?.costo_estimado ?? 0,
      costo_real: ticket?.costo_real ?? 0,
      currency: ticket?.currency ?? "DOP",
      fecha_reporte: ticket?.fecha_reporte ?? (defaultDate || new Date().toISOString().slice(0, 10)),
      fecha_programada: ticket?.fecha_programada ?? (defaultDate || ""),
      fecha_resuelto: ticket?.fecha_resuelto ?? "",
      asignacion_costo: ticket?.asignacion_costo ?? "propietario",
      notas: ticket?.notas ?? "",
    };
  }

  const [form, setForm] = useState(() => makeForm(editing, defaultPropId));

  useEffect(() => {
    if (open) setForm(makeForm(editing, defaultPropId));
  }, [open, editing?.id, defaultDate]);

  const conflictingRes = useMemo(() => {
    if (!form.fecha_programada || !reservations?.length) return null;
    const d = form.fecha_programada;
    return reservations.find(
      (r) => r.property_id === form.property_id
        && r.status !== "Cancelada"
        && d >= r.checkin && d < r.checkout
    ) ?? null;
  }, [form.fecha_programada, form.property_id, reservations]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    const payload = {
      ...form,
      fecha_programada: form.fecha_programada || null,
      fecha_resuelto: form.estado === "Resuelto" && !form.fecha_resuelto
        ? new Date().toISOString().slice(0, 10)
        : form.fecha_resuelto || null,
      descripcion: form.descripcion || null,
      tecnico_nombre: form.tecnico_nombre || null,
      tecnico_telefono: form.tecnico_telefono || null,
      notas: form.notas || null,
    };
    onSave(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench size={18} className="text-[#2D6A9F]" />
            {editing ? "Editar ticket" : "Nuevo ticket de mantenimiento"}
          </DialogTitle>
          <DialogDescription>
            {editing ? "Actualiza los datos del ticket." : "Registra un nuevo ticket de mantenimiento."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Propiedad</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.property_id}
                onChange={(e) => setForm({ ...form, property_id: e.target.value })}
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Categoría</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label>Título *</Label>
            <Input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ej: AC no enfría en habitación principal"
              required
            />
          </div>

          <div>
            <Label>Descripción</Label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm bg-background min-h-[60px] resize-y"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Detalles del problema..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Prioridad</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.prioridad}
                onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
              >
                {PRIORIDADES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <Label>Estado</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                {ESTADOS.map((e) => <option key={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Técnico asignado</Label>
              <Input
                value={form.tecnico_nombre}
                onChange={(e) => setForm({ ...form, tecnico_nombre: e.target.value })}
                placeholder="Nombre del técnico"
              />
            </div>
            <div>
              <Label>Teléfono técnico</Label>
              <Input
                value={form.tecnico_telefono}
                onChange={(e) => setForm({ ...form, tecnico_telefono: e.target.value })}
                placeholder="809-000-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Moneda</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="DOP">RD$ (DOP)</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <Label>Costo estimado</Label>
              <Input
                type="number" min={0} step="0.01"
                value={form.costo_estimado || ""}
                onChange={(e) => setForm({ ...form, costo_estimado: +e.target.value })}
              />
            </div>
            <div>
              <Label>Costo real</Label>
              <Input
                type="number" min={0} step="0.01"
                value={form.costo_real || ""}
                onChange={(e) => setForm({ ...form, costo_real: +e.target.value })}
              />
            </div>
          </div>

          {/* Cost assignment */}
          <div>
            <Label>Asignación de costo</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {ASIGNACION_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, asignacion_costo: value })}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left",
                    form.asignacion_costo === value
                      ? cn(color, "ring-2 ring-offset-1 ring-current/30 shadow-sm")
                      : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
                  )}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {form.asignacion_costo === "propietario" && "Se creará un cargo al propietario al sincronizar."}
              {form.asignacion_costo === "cana_escapes" && "Se registrará como gasto operativo de Cana Escapes."}
              {form.asignacion_costo === "incluido" && "Sin cargo — incluido en el mantenimiento mínimo del contrato."}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Fecha reporte</Label>
              <Input
                type="date"
                value={form.fecha_reporte}
                onChange={(e) => setForm({ ...form, fecha_reporte: e.target.value })}
              />
            </div>
            <div>
              <Label>Fecha programada</Label>
              <Input
                type="date"
                value={form.fecha_programada}
                onChange={(e) => setForm({ ...form, fecha_programada: e.target.value })}
                className={conflictingRes ? "border-red-400 focus-visible:ring-red-400" : ""}
              />
            </div>
            <div>
              <Label>Fecha resuelto</Label>
              <Input
                type="date"
                value={form.fecha_resuelto}
                onChange={(e) => setForm({ ...form, fecha_resuelto: e.target.value })}
              />
            </div>
          </div>
          {conflictingRes && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Conflicto con reserva</p>
                <p>Hay una reserva de <strong>{conflictingRes.guest_name}</strong> del {conflictingRes.checkin} al {conflictingRes.checkout} en esta propiedad. Selecciona otra fecha para evitar conflictos.</p>
              </div>
            </div>
          )}

          <div>
            <Label>Notas</Label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm bg-background min-h-[50px] resize-y"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.titulo.trim()}>
              {saving ? "Guardando…" : editing ? "Actualizar" : "Crear ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Schedule Form Dialog ────────────────────────────────────────
function ScheduleFormDialog({
  open, onOpenChange, editing, propertyId, properties, onSave, saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: MaintenanceSchedule | null;
  propertyId: string;
  properties: { id: string; name: string }[];
  onSave: (data: any) => void;
  saving: boolean;
}) {
  const defaultPropId = propertyId || properties[0]?.id || "";
  const today = new Date().toISOString().slice(0, 10);

  function makeSchedForm(s: MaintenanceSchedule | null) {
    return {
      property_id: s?.property_id ?? defaultPropId,
      categoria: s?.categoria ?? "Piscina",
      titulo: s?.titulo ?? "",
      descripcion: s?.descripcion ?? "",
      tecnico_nombre: s?.tecnico_nombre ?? "",
      tecnico_telefono: s?.tecnico_telefono ?? "",
      frecuencia_dias: s?.frecuencia_dias ?? 30,
      costo_estimado: s?.costo_estimado ?? 0,
      currency: s?.currency ?? "DOP",
      proxima_ejecucion: s?.proxima_ejecucion ?? today,
      activo: s?.activo ?? true,
      notas: s?.notas ?? "",
    };
  }

  const [form, setForm] = useState(() => makeSchedForm(editing));

  useEffect(() => {
    if (open) setForm(makeSchedForm(editing));
  }, [open, editing?.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    onSave({
      ...form,
      descripcion: form.descripcion || null,
      tecnico_nombre: form.tecnico_nombre || null,
      tecnico_telefono: form.tecnico_telefono || null,
      proxima_ejecucion: form.proxima_ejecucion || null,
      notas: form.notas || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw size={18} className="text-[#2D6A9F]" />
            {editing ? "Editar programación" : "Nuevo mantenimiento preventivo"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Propiedad</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Categoría</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Servicio de piscina quincenal" required />
          </div>
          <div>
            <Label>Descripción</Label>
            <textarea className="w-full border rounded-md px-3 py-2 text-sm bg-background min-h-[50px] resize-y" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Técnico</Label>
              <Input value={form.tecnico_nombre} onChange={(e) => setForm({ ...form, tecnico_nombre: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.tecnico_telefono} onChange={(e) => setForm({ ...form, tecnico_telefono: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Frecuencia (días)</Label>
              <Input type="number" min={1} value={form.frecuencia_dias} onChange={(e) => setForm({ ...form, frecuencia_dias: +e.target.value })} />
            </div>
            <div>
              <Label>Costo estimado</Label>
              <Input type="number" min={0} step="0.01" value={form.costo_estimado || ""} onChange={(e) => setForm({ ...form, costo_estimado: +e.target.value })} />
            </div>
            <div>
              <Label>Próxima ejecución</Label>
              <Input type="date" value={form.proxima_ejecucion} onChange={(e) => setForm({ ...form, proxima_ejecucion: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.titulo.trim()}>
              {saving ? "Guardando…" : editing ? "Actualizar" : "Crear programación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Calendar View ───────────────────────────────────────────────
const DAYS_SHORT = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

const TICKET_BAR_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Pendiente:    { bg: "bg-amber-500",   text: "text-white",     border: "border-amber-600" },
  "En Progreso":{ bg: "bg-[#2D6A9F]",   text: "text-white",     border: "border-[#1d5a8a]" },
  Resuelto:     { bg: "bg-emerald-600",  text: "text-white",     border: "border-emerald-700" },
  Cancelado:    { bg: "bg-slate-300",    text: "text-slate-500", border: "border-slate-400" },
};

const SCHEDULE_BAR_STYLE = { bg: "bg-violet-500", text: "text-white", border: "border-violet-600" };

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCalDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month - 1, 1);
  const firstDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const days: Date[] = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = new Date(firstDay); d.setDate(d.getDate() - (i + 1)); days.push(d);
  }
  const lastDate = new Date(year, month, 0).getDate();
  for (let d = 1; d <= lastDate; d++) days.push(new Date(year, month - 1, d));
  while (days.length < 42) {
    const last = days[days.length - 1];
    const next = new Date(last); next.setDate(next.getDate() + 1); days.push(next);
  }
  return days;
}

interface CalEvent {
  id: string; title: string; date: string; type: "ticket" | "schedule";
  estado?: string; prioridad?: string; categoria?: string; propertyName?: string;
  ticket?: MaintenanceTicket;
}

function isDateInReservation(dateStr: string, res: Reservation): boolean {
  return dateStr >= res.checkin && dateStr < res.checkout;
}

function getReservationsForDay(dateStr: string, reservations: Reservation[], propertyFilter: string): Reservation[] {
  return reservations.filter(
    (r) => r.status !== "Cancelada"
      && (propertyFilter === "__all__" || r.property_id === propertyFilter)
      && isDateInReservation(dateStr, r)
  );
}

interface ResSeg {
  reservation: Reservation;
  colStart: number; colEnd: number;
  isStart: boolean; isEnd: boolean;
  slot: number;
}

function getWeekReservationSegments(
  weekDays: Date[], reservations: Reservation[], propertyFilter: string,
): ResSeg[] {
  const wStartStr = toDateStr(weekDays[0]);
  const wEndStr = toDateStr(weekDays[6]);
  const filtered = reservations.filter(
    (r) => r.status !== "Cancelada"
      && (propertyFilter === "__all__" || r.property_id === propertyFilter)
      && r.checkin < wEndStr && r.checkout > wStartStr
  );
  const raw: Omit<ResSeg, "slot">[] = [];
  for (const r of filtered) {
    const segStart = r.checkin < wStartStr ? wStartStr : r.checkin;
    const segEndDate = r.checkout > wEndStr ? wEndStr : r.checkout;
    const colStart = weekDays.findIndex((d) => toDateStr(d) === segStart);
    let colEnd = weekDays.findIndex((d) => toDateStr(d) === segEndDate);
    if (colEnd === -1) colEnd = 6;
    else if (segEndDate === r.checkout && colEnd > 0) colEnd = colEnd - 1;
    if (colStart === -1) continue;
    if (colEnd < colStart) colEnd = colStart;
    raw.push({
      reservation: r,
      colStart,
      colEnd,
      isStart: r.checkin >= wStartStr,
      isEnd: r.checkout <= wEndStr,
    });
  }
  raw.sort((a, b) => a.colStart - b.colStart);
  const slotEnds: number[] = [];
  return raw.map((seg) => {
    let slot = 0;
    while (slotEnds[slot] !== undefined && seg.colStart <= slotEnds[slot]) slot++;
    slotEnds[slot] = seg.colEnd;
    return { ...seg, slot };
  });
}

/* Day hover preview tooltip */
function DayPreviewTooltip({
  dayStr, events, x, y, reservations = [],
}: { dayStr: string; events: CalEvent[]; x: number; y: number; reservations?: Reservation[] }) {
  const tipW = 270;
  const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const screenH = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = x + 8 + tipW > screenW ? x - tipW - 8 : x + 8;
  const top = Math.min(y, screenH - 320);

  const dayDate = new Date(dayStr + "T12:00:00");
  const dayLabel = `${dayDate.getDate()} de ${MONTHS_ES[dayDate.getMonth()]} ${dayDate.getFullYear()}`;
  const totalItems = events.length + reservations.length;

  return (
    <div
      style={{ position: "fixed", left, top, zIndex: 9999, width: tipW, pointerEvents: "none" }}
      className="bg-[#0B1F38] text-white rounded-xl shadow-2xl overflow-hidden text-[11px] border border-white/10"
    >
      <div className="px-3 py-2 bg-[#0F2B4C] border-b border-white/10 flex items-center justify-between">
        <p className="font-bold text-xs">{dayLabel}</p>
        <span className="text-white/40 text-[9px]">{totalItems} evento{totalItems !== 1 ? "s" : ""}</span>
      </div>
      <div className="px-3 py-2 space-y-2.5 max-h-[260px] overflow-y-auto">
        {reservations.map((r) => (
          <div key={r.id} className="flex items-start gap-2">
            <span className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 bg-red-500" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate leading-tight">{r.guest_name}</p>
              <div className="flex items-center gap-2 text-[9px] text-white/50 mt-0.5 flex-wrap">
                <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-red-900/40 text-red-300 border border-red-700/30">Reserva</span>
                <span>{r.checkin} → {r.checkout}</span>
                <span className="text-[#7EC8E3]">{r.platform}</span>
              </div>
            </div>
          </div>
        ))}
        {events.map((evt) => {
          const barStyle = evt.type === "schedule"
            ? { bg: "bg-violet-500" }
            : TICKET_BAR_STYLE[evt.estado ?? "Pendiente"] ?? TICKET_BAR_STYLE.Pendiente;
          return (
            <div key={evt.id} className="flex items-start gap-2">
              <span className={cn("w-2.5 h-2.5 rounded-full mt-0.5 shrink-0", barStyle.bg)} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate leading-tight">{evt.title}</p>
                <div className="flex items-center gap-2 text-[9px] text-white/50 mt-0.5 flex-wrap">
                  {evt.type === "ticket" && (
                    <>
                      <span className={cn("px-1 py-0.5 rounded text-[8px] font-bold", ESTADO_COLOR[evt.estado ?? "Pendiente"])}>{evt.estado}</span>
                      <span className={cn("px-1 py-0.5 rounded text-[8px] font-bold", PRIORIDAD_COLOR[evt.prioridad ?? "Media"])}>{evt.prioridad}</span>
                    </>
                  )}
                  {evt.type === "schedule" && (
                    <span className="text-violet-300 flex items-center gap-0.5"><RotateCcw size={7} /> Preventivo</span>
                  )}
                  {evt.propertyName && <span className="text-[#7EC8E3]">{evt.propertyName}</span>}
                </div>
                {evt.ticket && (evt.ticket.costo_estimado > 0 || evt.ticket.costo_real > 0) && (
                  <p className="text-[9px] text-white/40 mt-0.5 font-mono">
                    {evt.ticket.costo_real > 0
                      ? fmtCurrency(evt.ticket.costo_real, evt.ticket.currency)
                      : fmtCurrency(evt.ticket.costo_estimado, evt.ticket.currency)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-1.5 bg-[#0F2B4C] border-t border-white/10 text-center text-[9px] text-white/30">
        {reservations.length > 0 ? "Fecha ocupada por reserva" : "Clic en el día para crear mantenimiento"}
      </div>
    </div>
  );
}

function CalendarView({
  tickets, schedules, properties, month, year, month2, year2, onEditTicket, onCreateTicket, onMoveTicket, reservations, propertyFilter,
}: {
  tickets: MaintenanceTicket[];
  schedules: MaintenanceSchedule[];
  properties: { id: string; name: string }[];
  month: number;
  year: number;
  month2: number;
  year2: number;
  onEditTicket: (t: MaintenanceTicket) => void;
  onCreateTicket: (date: string) => void;
  onMoveTicket: (ticket: MaintenanceTicket, newDate: string) => void;
  reservations: Reservation[];
  propertyFilter: string;
}) {
  const propName = (id: string) => properties.find((p) => p.id === id)?.name ?? "—";
  const todayStr = toDateStr(new Date());
  const BAR_H = 22, BAR_GAP = 2;

  const [draggingTicket, setDraggingTicket] = useState<MaintenanceTicket | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const dragMovedRef = useRef(false);

  useEffect(() => {
    if (!draggingTicket) { dragMovedRef.current = false; return; }
    const handleUp = () => {
      if (dragOverDay && dragMovedRef.current) {
        const dayRes = getReservationsForDay(dragOverDay, reservations, propertyFilter);
        if (dayRes.length > 0) {
          toast({ title: "Fecha ocupada", description: `No puedes mover aquí — reserva activa (${dayRes[0].guest_name}).`, variant: "destructive" });
        } else {
          onMoveTicket(draggingTicket, dragOverDay);
        }
      } else if (!dragMovedRef.current) {
        onEditTicket(draggingTicket);
      }
      setDraggingTicket(null);
      setDragOverDay(null);
      dragMovedRef.current = false;
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setDraggingTicket(null); setDragOverDay(null); dragMovedRef.current = false; }
    };
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("keydown", handleEsc);
    return () => { window.removeEventListener("mouseup", handleUp); window.removeEventListener("keydown", handleEsc); };
  }, [draggingTicket, dragOverDay, reservations, propertyFilter]);

  // Hover state for day preview tooltip
  const [hoveredDay, setHoveredDay] = useState<{ dayStr: string; events: CalEvent[]; x: number; y: number; reservations?: Reservation[] } | null>(null);

  // Build events array from tickets & schedules
  const events: CalEvent[] = useMemo(() => {
    const evts: CalEvent[] = [];
    tickets.forEach((t) => {
      const dates = [t.fecha_programada, t.fecha_reporte].filter(Boolean) as string[];
      const date = dates[0] ?? "";
      if (date) evts.push({
        id: t.id, title: t.titulo, date, type: "ticket",
        estado: t.estado, prioridad: t.prioridad, categoria: t.categoria,
        propertyName: propName(t.property_id), ticket: t,
      });
    });
    schedules.forEach((s) => {
      if (s.activo && s.proxima_ejecucion) evts.push({
        id: s.id, title: s.titulo, date: s.proxima_ejecucion, type: "schedule",
        categoria: s.categoria, propertyName: propName(s.property_id),
      });
    });
    return evts;
  }, [tickets, schedules, properties]);

  /* Render a single month grid */
  function renderMonth(mo: number, yr: number) {
    const calDays = getCalDays(yr, mo);
    const allWeeks: Date[][] = [];
    for (let i = 0; i < calDays.length; i += 7) allWeeks.push(calDays.slice(i, i + 7));
    // Trim last row if entirely outside this month
    const weeks = allWeeks.length > 5 && allWeeks[5].every((d) => d.getMonth() + 1 !== mo)
      ? allWeeks.slice(0, 5) : allWeeks;

    function getWeekEvents(weekDays: Date[]) {
      const wStart = toDateStr(weekDays[0]);
      const wEnd = toDateStr(weekDays[6]);
      return events
        .filter((e) => e.date >= wStart && e.date <= wEnd)
        .map((e) => {
          const col = weekDays.findIndex((d) => toDateStr(d) === e.date);
          return { ...e, col: col === -1 ? 0 : col };
        })
        .sort((a, b) => a.col - b.col);
    }

    return (
      <div className="flex-1 min-w-0">
        {/* Month name */}
        <div className="py-2.5 text-center border-b border-slate-100">
          <span className="text-sm font-bold tracking-wide text-[#0F2B4C]">
            {MONTHS_ES[mo - 1]} {yr}
          </span>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAYS_SHORT.map((d, di) => (
            <div key={d} className={cn(
              "py-1.5 text-center text-[9px] font-bold uppercase tracking-wider",
              di >= 5 ? "text-[#F0A030]" : "text-slate-400",
            )}>
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((weekDays, wi) => {
          const weekEvents = getWeekEvents(weekDays);
          const resSegs = getWeekReservationSegments(weekDays, reservations, propertyFilter);
          const resMaxSlot = resSegs.reduce((m, s) => Math.max(m, s.slot), -1);
          const totalBars = weekEvents.length + (resMaxSlot >= 0 ? resMaxSlot + 1 : 0);
          const eventsH = totalBars > 0 ? totalBars * (BAR_H + BAR_GAP) + BAR_GAP : 4;
          const RES_BAR_H = 20;

          return (
            <div key={wi} className="border-b border-slate-100 last:border-0">
              {/* Day cells */}
              <div className="grid grid-cols-7">
                {weekDays.map((day, di) => {
                  const dayStr = toDateStr(day);
                  const isToday = dayStr === todayStr;
                  const isCurMo = day.getMonth() + 1 === mo && day.getFullYear() === yr;
                  const isWeekend = di >= 5;
                  const dayEvts = weekEvents.filter((e) => e.col === di);
                  const dayReservations = isCurMo ? getReservationsForDay(dayStr, reservations, propertyFilter) : [];
                  const hasReservation = dayReservations.length > 0;
                  const isPast = isCurMo && dayStr < todayStr;

                  const isDragTarget = draggingTicket && isCurMo && dragOverDay === dayStr;

                  return (
                    <div
                      key={dayStr}
                      className={cn(
                        "group relative flex items-start justify-between px-1 pt-1 pb-0.5 min-h-[36px] border-r border-slate-100 last:border-r-0 transition-colors overflow-hidden",
                        isDragTarget && !hasReservation
                          ? "bg-sky-100 ring-2 ring-inset ring-sky-400"
                          : isDragTarget && hasReservation
                            ? "bg-red-100 ring-2 ring-inset ring-red-400"
                            : hasReservation && isCurMo
                              ? "bg-red-50/60 cursor-not-allowed"
                              : isWeekend && isCurMo ? "bg-amber-50/80 hover:bg-amber-100/60"
                              : isCurMo ? "bg-white hover:bg-slate-50" : "bg-slate-50/50",
                        isCurMo && !hasReservation && !draggingTicket && "cursor-pointer",
                        draggingTicket && isCurMo && !hasReservation && "cursor-grab",
                        isPast && "opacity-40",
                      )}
                      onMouseEnter={(e) => {
                        if (draggingTicket && isCurMo) {
                          setDragOverDay(dayStr);
                          setHoveredDay(null);
                          dragMovedRef.current = true;
                          return;
                        }
                        if ((dayEvts.length > 0 || hasReservation) && isCurMo) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredDay({ dayStr, events: dayEvts, x: rect.right, y: rect.top, reservations: dayReservations });
                        }
                      }}
                      onMouseLeave={() => {
                        if (draggingTicket) setDragOverDay(null);
                        else setHoveredDay(null);
                      }}
                      onClick={() => {
                        if (!isCurMo || draggingTicket) return;
                        if (hasReservation) {
                          toast({ title: "Fecha ocupada", description: `Reserva activa (${dayReservations[0].guest_name}). Elige una fecha disponible.`, variant: "destructive" });
                          return;
                        }
                        onCreateTicket(dayStr);
                      }}
                    >
                      <span className={cn(
                        "relative inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold z-10",
                        isToday ? "bg-[#F0A030] text-white shadow-sm"
                          : isCurMo ? "text-[#0F2B4C]" : "text-slate-300",
                      )}>
                        {day.getDate()}
                      </span>
                      {/* Dot indicators */}
                      {dayEvts.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5 z-10">
                          {dayEvts.slice(0, 3).map((e) => (
                            <span key={e.id} className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              e.type === "schedule" ? "bg-violet-500"
                                : e.prioridad === "Urgente" ? "bg-red-500"
                                : e.prioridad === "Alta" ? "bg-amber-500"
                                : "bg-[#2D6A9F]",
                            )} />
                          ))}
                        </div>
                      )}
                      {/* + button on hover (only available days) */}
                      {isCurMo && !hasReservation && (
                        <span className="absolute bottom-0 right-0.5 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-[#2D6A9F] text-white text-[9px] font-bold shadow-sm z-20 opacity-70 hover:opacity-100">
                          +
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Event bars (reservations + maintenance) */}
              <div className="relative border-t border-slate-50" style={{ height: eventsH }}>
                {/* Continuous reservation bars */}
                {resSegs.map((seg, si) => {
                  const r = seg.reservation;
                  const isPastRes = r.checkout < todayStr;
                  const colW = 100 / 7;
                  const top = seg.slot * (BAR_H + BAR_GAP) + BAR_GAP;

                  return (
                    <div
                      key={`res-${r.id}-${si}`}
                      className={cn(
                        "absolute flex items-center gap-1 border overflow-hidden cursor-default",
                        "bg-red-500 text-white border-red-600",
                        seg.isStart ? "rounded-l-full pl-2" : "border-l-0",
                        seg.isEnd ? "rounded-r-full pr-2" : "border-r-0",
                        isPastRes && "opacity-40",
                      )}
                      style={{
                        left: `calc(${seg.colStart * colW}% + ${seg.isStart ? 3 : 0}px)`,
                        width: `calc(${(seg.colEnd - seg.colStart + 1) * colW}% - ${(seg.isStart ? 3 : 0) + (seg.isEnd ? 3 : 0)}px)`,
                        top: `${top}px`,
                        height: `${RES_BAR_H}px`,
                        fontSize: "10px",
                        fontWeight: 600,
                        lineHeight: "1",
                      }}
                      title={`Reserva: ${r.guest_name} · ${r.checkin} → ${r.checkout} · ${r.nights}n · ${r.platform}`}
                    >
                      {seg.isStart && (
                        <>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          <span className="truncate leading-none">{r.guest_name}</span>
                          <span className="ml-auto shrink-0 flex items-center gap-0.5 opacity-80 pr-0.5">
                            <span className="text-[9px]">{r.nights}n</span>
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
                {/* Maintenance event bars */}
                {weekEvents.map((evt, ei) => {
                  const barStyle = evt.type === "schedule"
                    ? SCHEDULE_BAR_STYLE
                    : TICKET_BAR_STYLE[evt.estado ?? "Pendiente"] ?? TICKET_BAR_STYLE.Pendiente;
                  const isResolved = evt.estado === "Resuelto" || evt.estado === "Cancelado";
                  const isPast = evt.date < todayStr;
                  const resBarCount = resMaxSlot >= 0 ? resMaxSlot + 1 : 0;

                  const isDragging = draggingTicket?.id === evt.id;

                  return (
                    <button
                      key={evt.id}
                      onMouseDown={(e) => {
                        if (e.button !== 0 || !evt.ticket) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setDraggingTicket(evt.ticket);
                        setHoveredDay(null);
                      }}
                      onClick={(e) => { e.stopPropagation(); }}
                      className={cn(
                        "absolute flex items-center gap-1 rounded-md px-1.5 text-[9px] font-semibold leading-none border shadow-sm truncate transition-all",
                        evt.ticket ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                        barStyle.bg, barStyle.text, barStyle.border,
                        (isResolved || isPast) && !isDragging && "opacity-40",
                        !isDragging && "hover:shadow-md hover:brightness-110",
                        isDragging && "ring-2 ring-sky-400 ring-offset-1 opacity-50 scale-95 z-10",
                      )}
                      style={{
                        top: BAR_GAP + (resBarCount + ei) * (BAR_H + BAR_GAP),
                        height: BAR_H,
                        left: `calc(${(evt.col / 7) * 100}% + 3px)`,
                        width: `calc(${(1 / 7) * 100}% - 6px)`,
                      }}
                      title={`${evt.title} — ${evt.propertyName ?? ""} · Arrastra para mover`}
                    >
                      {evt.type === "schedule" && <RotateCcw size={8} className="shrink-0" />}
                      {evt.type === "ticket" && evt.prioridad === "Urgente" && <AlertTriangle size={8} className="shrink-0" />}
                      <span className="truncate">{evt.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white relative">
      {/* Two months side by side (1 month on mobile, 2 on md+) */}
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">
        {renderMonth(month, year)}
        <div className="hidden md:block">{renderMonth(month2, year2)}</div>
      </div>

      {/* Drag banner */}
      {draggingTicket && (
        <div className="flex items-center justify-between px-4 py-2 bg-sky-50 border-t border-sky-200">
          <div className="flex items-center gap-2 text-xs text-sky-800 font-semibold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-sky-600"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
            Arrastrando: <span className="font-bold">{draggingTicket.titulo}</span> — Suelta en un día disponible
          </div>
        </div>
      )}

      {/* Legend + hint */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          {Object.entries(TICKET_BAR_STYLE).map(([status, s]) => (
            <div key={status} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={cn("w-3 h-2 rounded-sm", s.bg)} />
              {status}
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="w-3 h-2 rounded-sm bg-violet-500" />
            Preventivo
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-red-600 font-semibold">
            <span className="w-3 h-2 rounded-sm bg-red-500" />
            Reserva (bloqueado)
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Plus size={10} /> Clic para crear · Arrastra ticket para mover
        </div>
      </div>

      {/* Day hover tooltip */}
      {hoveredDay && <DayPreviewTooltip {...hoveredDay} />}
    </div>
  );
}

// ── Ticket Hover Tooltip ────────────────────────────────────────
function TicketTooltip({
  t, x, y, propName,
}: { t: MaintenanceTicket; x: number; y: number; propName: string }) {
  const asig = ASIGNACION_OPTIONS.find((a) => a.value === t.asignacion_costo);
  const EstIcon = ESTADO_ICON[t.estado] ?? Clock;
  const tipW = 280;
  const screenW = window.innerWidth;
  const left = x + 16 + tipW > screenW ? x - tipW - 8 : x + 16;
  const top = Math.min(y - 10, window.innerHeight - 380);

  return (
    <div
      style={{ position: "fixed", left, top, zIndex: 9999, width: tipW, pointerEvents: "none" }}
      className="bg-[#0B1F38] text-white rounded-xl shadow-2xl overflow-hidden text-[11px] border border-white/10"
    >
      {/* Header */}
      <div className="px-3 py-2.5 bg-[#0F2B4C] border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${ESTADO_COLOR[t.estado]}`}>
            <EstIcon size={9} /> {t.estado}
          </span>
          <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${PRIORIDAD_COLOR[t.prioridad]}`}>
            {t.prioridad}
          </span>
        </div>
        <p className="font-semibold truncate">{t.titulo}</p>
      </div>

      <div className="px-3 py-2 space-y-2">
        {/* Property & category */}
        <div className="grid grid-cols-2 gap-x-3 border-b border-white/10 pb-2">
          <div>
            <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Propiedad</p>
            <p className="font-semibold text-[#7EC8E3]">{propName}</p>
          </div>
          <div>
            <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Categoría</p>
            <p className="font-semibold">{t.categoria}</p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-3 gap-x-3 border-b border-white/10 pb-2">
          <div>
            <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Reportado</p>
            <p className="font-semibold">{t.fecha_reporte}</p>
          </div>
          {t.fecha_programada && (
            <div>
              <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Programado</p>
              <p className="font-semibold">{t.fecha_programada}</p>
            </div>
          )}
          {t.fecha_resuelto && (
            <div>
              <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Resuelto</p>
              <p className="font-semibold text-emerald-300">{t.fecha_resuelto}</p>
            </div>
          )}
        </div>

        {/* Technician */}
        {t.tecnico_nombre && (
          <div className="border-b border-white/10 pb-2">
            <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Técnico</p>
            <p className="font-semibold">{t.tecnico_nombre} {t.tecnico_telefono && `· ${t.tecnico_telefono}`}</p>
          </div>
        )}

        {/* Costs */}
        <div className="space-y-1">
          {t.costo_estimado > 0 && (
            <div className="flex justify-between">
              <span className="text-white/60">Estimado</span>
              <span className="font-mono">{fmtCurrency(t.costo_estimado, t.currency)}</span>
            </div>
          )}
          {t.costo_real > 0 && (
            <div className="flex justify-between">
              <span className="text-white/60">Costo real</span>
              <span className="font-mono font-bold text-[#F0A030]">{fmtCurrency(t.costo_real, t.currency)}</span>
            </div>
          )}
        </div>

        {/* Assignment */}
        <div className="border-t border-white/10 pt-2 flex justify-between items-center">
          <span className="text-white/50 text-[9px] uppercase tracking-wider">Asignación</span>
          <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${asig?.color ?? ""}`}>
            {asig?.label ?? "Propietario"}
          </span>
        </div>

        {/* Description */}
        {t.descripcion && (
          <div className="border-t border-white/10 pt-1.5">
            <p className="text-white/40 text-[9px] uppercase tracking-wider mb-0.5">Descripción</p>
            <p className="text-white/70 leading-snug line-clamp-3">{t.descripcion}</p>
          </div>
        )}

        {/* Notes */}
        {t.notas && (
          <div className="border-t border-white/10 pt-1.5">
            <p className="text-white/40 text-[9px] uppercase tracking-wider mb-0.5">Notas</p>
            <p className="text-white/70 leading-snug line-clamp-2">{t.notas}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────
export function AdminMantenimiento() {
  const { data: properties = [] } = useProperties();
  const { selectedPropertyId } = useProperty();
  useOwners();
  const { data: tickets = [], isLoading: loadingTickets } = useMaintenanceTickets();
  const { data: schedules = [] } = useMaintenanceSchedules();
  const { data: allReservations = [] } = useAllReservationsGlobal();

  const createTicket = useCreateMaintenanceTicket();
  const updateTicket = useUpdateMaintenanceTicket();
  const deleteTicket = useDeleteMaintenanceTicket();
  const createSchedule = useCreateMaintenanceSchedule();
  const updateSchedule = useUpdateMaintenanceSchedule();
  const deleteSchedule = useDeleteMaintenanceSchedule();
  const syncToCharge = useSyncTicketToCharge();

  const [view, setView] = useState<"lista" | "calendario" | "preventivo" | "analisis">("lista");
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<MaintenanceTicket | null>(null);
  const [calDefaultDate, setCalDefaultDate] = useState<string>("");
  const [confirmingEdit, setConfirmingEdit] = useState<any>(null);
  const [deletingTicket, setDeletingTicket] = useState<MaintenanceTicket | null>(null);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>("__all__");
  const [filterCategoria, setFilterCategoria] = useState<string>("__all__");
  const [filterProperty, setFilterProperty] = useState<string>(selectedPropertyId || "__all__");
  const [propInitialized, setPropInitialized] = useState(false);

  // Sync to active property on first load
  useEffect(() => {
    if (!propInitialized && selectedPropertyId) {
      setFilterProperty(selectedPropertyId);
      setPropInitialized(true);
    }
  }, [selectedPropertyId, propInitialized]);

  // Month filter
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  function prevFilterMonth() {
    if (filterMonth === 1) { setFilterMonth(12); setFilterYear((y) => y - 1); }
    else setFilterMonth((m) => m - 1);
  }
  function nextFilterMonth() {
    if (filterMonth === 12) { setFilterMonth(1); setFilterYear((y) => y + 1); }
    else setFilterMonth((m) => m + 1);
  }

  // Hover tooltip
  const [hoveredTicket, setHoveredTicket] = useState<MaintenanceTicket | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Calendar uses the same filterMonth/filterYear — no separate state needed

  const propName = (id: string) => properties.find((p) => p.id === id)?.name ?? "—";

  const filteredTickets = useMemo(() => {
    let list = filterProperty === "__all__" ? [...tickets] : tickets.filter((t) => t.property_id === filterProperty);
    // Month filter — use fecha_reporte as the reference date
    list = list.filter((t) => {
      const d = new Date(t.fecha_reporte + "T00:00:00");
      return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
    });
    if (filterEstado !== "__all__") list = list.filter((t) => t.estado === filterEstado);
    if (filterCategoria !== "__all__") list = list.filter((t) => t.categoria === filterCategoria);
    list.sort((a, b) => {
      const ew = (ESTADO_WEIGHT[a.estado] ?? 9) - (ESTADO_WEIGHT[b.estado] ?? 9);
      if (ew !== 0) return ew;
      const pw = (PRIORIDAD_WEIGHT[a.prioridad] ?? 9) - (PRIORIDAD_WEIGHT[b.prioridad] ?? 9);
      if (pw !== 0) return pw;
      const dateA = a.fecha_programada ?? a.fecha_reporte;
      const dateB = b.fecha_programada ?? b.fecha_reporte;
      return dateA.localeCompare(dateB);
    });
    return list;
  }, [tickets, filterProperty, filterEstado, filterCategoria, filterMonth, filterYear]);

  const filteredSchedules = useMemo(() => {
    const list = filterProperty === "__all__" ? [...schedules] : schedules.filter((s) => s.property_id === filterProperty);
    list.sort((a, b) => {
      const da = a.proxima_ejecucion ?? "9999-12-31";
      const db = b.proxima_ejecucion ?? "9999-12-31";
      return da.localeCompare(db);
    });
    return list;
  }, [schedules, filterProperty]);

  const kpis = useMemo(() => {
    let base = filterProperty === "__all__" ? tickets : tickets.filter((t) => t.property_id === filterProperty);
    base = base.filter((t) => {
      const d = new Date(t.fecha_reporte + "T00:00:00");
      return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
    });
    return {
      total: base.length,
      pendientes: base.filter((t) => t.estado === "Pendiente").length,
      enProgreso: base.filter((t) => t.estado === "En Progreso").length,
      resueltos: base.filter((t) => t.estado === "Resuelto").length,
      costoTotal: base.filter((t) => t.estado === "Resuelto").reduce((s, t) => s + t.costo_real, 0),
      urgentes: base.filter((t) => t.prioridad === "Urgente" && t.estado !== "Resuelto" && t.estado !== "Cancelado").length,
    };
  }, [tickets, filterProperty, filterMonth, filterYear]);

  // When editing, ask for confirmation first
  function handleSaveTicket(data: any) {
    if (editingTicket) {
      setConfirmingEdit(data);
    } else {
      doSaveTicket(data);
    }
  }

  async function doSaveTicket(data: any) {
    let savedTicket: MaintenanceTicket;
    if (editingTicket) {
      savedTicket = await updateTicket.mutateAsync({ id: editingTicket.id, ...data });
      toast({ title: "Ticket actualizado", variant: "success" });
    } else {
      savedTicket = await createTicket.mutateAsync(data);
      toast({ title: "Ticket creado", variant: "success" });
    }
    setTicketFormOpen(false);
    setEditingTicket(null);
    setConfirmingEdit(null);

    // Auto-sync: when ticket is Resuelto and has a cost, sync to charges automatically
    if (
      savedTicket.estado === "Resuelto" &&
      savedTicket.asignacion_costo !== "incluido" &&
      !savedTicket.charge_id &&
      (savedTicket.costo_real > 0 || savedTicket.costo_estimado > 0)
    ) {
      try {
        const prop = properties.find((p) => p.id === savedTicket.property_id) as Property | undefined;
        const ownerId = prop?.owner_id ?? null;
        await syncToCharge.mutateAsync({ ticket: savedTicket, ownerId });
        const dest = savedTicket.asignacion_costo === "cana_escapes" ? "Cana Escapes" : "Cargos Propietario";
        toast({ title: `Auto-sincronizado con ${dest}`, variant: "success" });
      } catch (err: any) {
        toast({ title: "Error al auto-sincronizar", description: err.message, variant: "destructive" });
      }
    }
  }

  async function handleDeleteTicket() {
    if (!deletingTicket) return;
    await deleteTicket.mutateAsync(deletingTicket.id);
    toast({ title: "Ticket eliminado" });
    setDeletingTicket(null);
  }

  async function handleSaveSchedule(data: any) {
    if (editingSchedule) {
      await updateSchedule.mutateAsync({ id: editingSchedule.id, ...data });
      toast({ title: "Programación actualizada", variant: "success" });
    } else {
      await createSchedule.mutateAsync(data);
      toast({ title: "Programación creada", variant: "success" });
    }
    setScheduleFormOpen(false);
    setEditingSchedule(null);
  }

  // Compute next month for the two-month calendar display
  const filterMonth2 = filterMonth === 12 ? 1 : filterMonth + 1;
  const filterYear2 = filterMonth === 12 ? filterYear + 1 : filterYear;

  function goToToday() {
    const t = new Date();
    setFilterMonth(t.getMonth() + 1);
    setFilterYear(t.getFullYear());
  }

  const exportData = view === "preventivo" ? filteredSchedules : filteredTickets;

  // ── Chart data (uses ALL tickets for the selected month+property, ignoring estado/categoria filters) ──
  const chartBase = useMemo(() => {
    let list = filterProperty === "__all__" ? [...tickets] : tickets.filter((t) => t.property_id === filterProperty);
    return list.filter((t) => {
      const d = new Date(t.fecha_reporte + "T00:00:00");
      return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
    });
  }, [tickets, filterProperty, filterMonth, filterYear]);

  const ESTADO_COLORS: Record<string, string> = {
    Pendiente: "#F59E0B", "En Progreso": "#3B82F6", Resuelto: "#10B981", Cancelado: "#94A3B8",
  };
  const PRIORIDAD_COLORS: Record<string, string> = {
    Baja: "#94A3B8", Media: "#3B82F6", Alta: "#F59E0B", Urgente: "#EF4444",
  };
  const ASIG_COLORS: Record<string, string> = {
    propietario: "#F59E0B", cana_escapes: "#3B82F6", incluido: "#10B981",
  };

  const chartEstado = useMemo(() => {
    const counts: Record<string, number> = {};
    chartBase.forEach((t) => { counts[t.estado] = (counts[t.estado] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: ESTADO_COLORS[name] ?? "#6B7280" }));
  }, [chartBase]);

  const chartCategoria = useMemo(() => {
    const map: Record<string, { count: number; costo: number }> = {};
    chartBase.forEach((t) => {
      if (!map[t.categoria]) map[t.categoria] = { count: 0, costo: 0 };
      map[t.categoria].count += 1;
      map[t.categoria].costo += t.costo_real > 0 ? t.costo_real : t.costo_estimado;
    });
    return Object.entries(map)
      .map(([cat, v]) => ({ categoria: cat, tickets: v.count, costo: v.costo }))
      .sort((a, b) => b.costo - a.costo);
  }, [chartBase]);

  const chartPrioridad = useMemo(() => {
    const counts: Record<string, number> = {};
    chartBase.forEach((t) => { counts[t.prioridad] = (counts[t.prioridad] ?? 0) + 1; });
    return ["Urgente", "Alta", "Media", "Baja"]
      .filter((p) => counts[p])
      .map((name) => ({ name, value: counts[name], color: PRIORIDAD_COLORS[name] }));
  }, [chartBase]);

  const chartAsignacion = useMemo(() => {
    const counts: Record<string, number> = {};
    chartBase.forEach((t) => { counts[t.asignacion_costo] = (counts[t.asignacion_costo] ?? 0) + 1; });
    const labels: Record<string, string> = { propietario: "Propietario", cana_escapes: "Cana Escapes", incluido: "Incluido" };
    return Object.entries(counts).map(([key, value]) => ({ name: labels[key] ?? key, value, color: ASIG_COLORS[key] ?? "#6B7280" }));
  }, [chartBase]);

  const chartPropiedad = useMemo(() => {
    if (filterProperty !== "__all__") return [];
    const map: Record<string, { name: string; tickets: number; costo: number }> = {};
    chartBase.forEach((t) => {
      if (!map[t.property_id]) map[t.property_id] = { name: propName(t.property_id), tickets: 0, costo: 0 };
      map[t.property_id].tickets += 1;
      map[t.property_id].costo += t.costo_real > 0 ? t.costo_real : t.costo_estimado;
    });
    return Object.values(map).sort((a, b) => b.tickets - a.tickets);
  }, [chartBase, filterProperty, properties]);

  const PROP_COLORS = ["#0F2B4C", "#2D6A9F", "#F0A030", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"];

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
    <div className="max-w-screen-2xl mx-auto animate-fade-in space-y-5 text-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-[#0F2B4C] flex items-center gap-2">
            <Wrench size={22} /> Mantenimiento
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Tickets, calendario y mantenimiento preventivo</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-white/80 border-border shadow-sm"
            onClick={() => {
              if (view === "preventivo") {
                downloadSchedulesCSV(filteredSchedules, properties);
              } else {
                downloadTicketsCSV(filteredTickets, properties);
              }
            }}
            disabled={exportData.length === 0}
          >
            <Download size={13} />
            Exportar CSV
          </Button>
          {view === "preventivo" ? (
            <Button onClick={() => { setEditingSchedule(null); setScheduleFormOpen(true); }}>
              <Plus size={15} className="mr-1.5" /> Nueva programación
            </Button>
          ) : (
            <Button onClick={() => { setEditingTicket(null); setTicketFormOpen(true); }}>
              <Plus size={15} className="mr-1.5" /> Nuevo ticket
            </Button>
          )}
        </div>
      </div>

      {/* Month navigator — AdminCalendario style */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
          <button onClick={prevFilterMonth}
            className="px-3 py-2 hover:bg-slate-50 transition-colors text-[#0F2B4C] border-r border-slate-200">
            <ChevronLeft size={15} />
          </button>
          <div className="px-4 py-2 bg-[#0F2B4C]/[0.03] border-r border-slate-200">
            <span className="text-xs font-bold text-[#0F2B4C] whitespace-nowrap">
              {MONTHS_ES[filterMonth - 1]} {filterYear}
            </span>
          </div>
          {view === "calendario" && (
            <>
              <div className="hidden md:block px-2 text-slate-300 text-xs select-none">→</div>
              <div className="hidden md:block px-4 py-2 bg-[#2D6A9F]/[0.04] border-l border-slate-200">
                <span className="text-xs font-bold text-[#2D6A9F] whitespace-nowrap">
                  {MONTHS_ES[filterMonth2 - 1]} {filterYear2}
                </span>
              </div>
            </>
          )}
          <button onClick={nextFilterMonth}
            className="px-3 py-2 hover:bg-slate-50 transition-colors text-[#0F2B4C] border-l border-slate-200">
            <ChevronRight size={15} />
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          <CalendarDays size={13} className="mr-1.5" />Hoy
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {([
          { label: "Total", value: String(kpis.total), sub: kpis.total === 1 ? "ticket" : "tickets",
            Icon: Wrench, topCls: "bg-[#0F2B4C]", valCls: "text-[#0F2B4C]" },
          { label: "Pendientes", value: String(kpis.pendientes), sub: "por atender",
            Icon: Clock, topCls: "bg-amber-600", valCls: "text-amber-700" },
          { label: "En Progreso", value: String(kpis.enProgreso), sub: "en ejecución",
            Icon: RotateCcw, topCls: "bg-[#2D6A9F]", valCls: "text-[#2D6A9F]" },
          { label: "Resueltos", value: String(kpis.resueltos), sub: "completados",
            Icon: CheckCircle2, topCls: "bg-emerald-600", valCls: "text-emerald-700" },
          { label: "Urgentes", value: String(kpis.urgentes), sub: "prioridad alta",
            Icon: AlertTriangle, topCls: "bg-red-600", valCls: "text-red-700" },
          { label: "Costo resueltos", value: fmtCurrency(kpis.costoTotal, "DOP"), sub: "monto total",
            Icon: TrendingUp, topCls: "bg-teal-600", valCls: "text-teal-700" },
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

      {/* View tabs */}
      <div className="flex gap-1 bg-white/70 backdrop-blur rounded-xl p-1 border w-fit">
        {([
          { id: "lista", label: "Lista", icon: List },
          { id: "calendario", label: "Calendario", icon: Calendar },
          { id: "preventivo", label: "Preventivo", icon: RotateCcw },
          { id: "analisis", label: "Análisis", icon: BarChart3 },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all",
              view === id
                ? "bg-[#0F2B4C] text-white shadow-sm"
                : "text-[#0F2B4C]/70 hover:bg-[#0F2B4C]/5"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Filters (shared) ────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-muted-foreground" />
        <select
          className="border rounded-md px-2 py-1 text-xs bg-background"
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
        >
          <option value="__all__">Todas las propiedades</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {view !== "preventivo" && (
          <>
            <select
              className="border rounded-md px-2 py-1 text-xs bg-background"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="__all__">Todos los estados</option>
              {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <select
              className="border rounded-md px-2 py-1 text-xs bg-background"
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
            >
              <option value="__all__">Todas las categorías</option>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}
        {(filterProperty !== "__all__" || filterEstado !== "__all__" || filterCategoria !== "__all__") && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setFilterProperty("__all__"); setFilterEstado("__all__"); setFilterCategoria("__all__"); }}>
            <X size={12} className="mr-1" /> Limpiar
          </Button>
        )}
      </div>

      {/* ── LIST VIEW ──────────────────────────────────────────── */}
      {view === "lista" && (
        <>
          {loadingTickets ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">Cargando…</div>
          ) : filteredTickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Wrench size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No hay tickets de mantenimiento</p>
                <p className="text-xs text-muted-foreground mt-1">Crea el primer ticket con el botón de arriba</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredTickets.map((t) => {
                const EstadoIcon = ESTADO_ICON[t.estado] ?? Clock;
                const days = t.estado === "Pendiente" || t.estado === "En Progreso"
                  ? daysUntil(t.fecha_programada)
                  : null;
                const asignacion = ASIGNACION_OPTIONS.find((a) => a.value === t.asignacion_costo);
                const AsigIcon = asignacion?.icon ?? UserCheck;
                return (
                  <Card
                    key={t.id}
                    className={cn(
                      "hover:shadow-md transition-shadow cursor-default",
                      days !== null && days < 0 && "border-red-200 bg-red-50/30",
                      days !== null && days === 0 && "border-amber-300 bg-amber-50/30",
                    )}
                    onMouseEnter={(e) => {
                      setHoveredTicket(t);
                      setTooltipPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setHoveredTicket(null)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-sm text-[#0F2B4C] truncate">{t.titulo}</h3>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5", PRIORIDAD_COLOR[t.prioridad])}>
                              {t.prioridad}
                            </Badge>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 gap-1", ESTADO_COLOR[t.estado])}>
                              <EstadoIcon size={10} />
                              {t.estado}
                            </Badge>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 gap-1", asignacion?.color)}>
                              <AsigIcon size={10} />
                              {asignacion?.label ?? "Propietario"}
                            </Badge>
                            {daysUntilBadge(days)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            {filterProperty === "__all__" && (
                              <span className="flex items-center gap-1 font-semibold text-[#2D6A9F]">
                                <Building2 size={10} /> {propName(t.property_id)}
                              </span>
                            )}
                            <span className="font-medium">{t.categoria}</span>
                            <span>{t.fecha_reporte}</span>
                            {t.tecnico_nombre && (
                              <span className="flex items-center gap-1">
                                <User size={10} /> {t.tecnico_nombre}
                              </span>
                            )}
                            {t.tecnico_telefono && (
                              <span className="flex items-center gap-1">
                                <Phone size={10} /> {t.tecnico_telefono}
                              </span>
                            )}
                            {t.costo_real > 0 && (
                              <span className="font-mono font-semibold text-[#2D6A9F]">
                                {fmtCurrency(t.costo_real, t.currency)}
                              </span>
                            )}
                          </div>
                          {t.descripcion && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.descripcion}</p>
                          )}
                        </div>
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onMouseEnter={(e) => { e.stopPropagation(); setHoveredTicket(null); }}
                        >
                          <Button
                            variant="ghost" size="icon" className="h-9 w-9 hover:bg-[#2D6A9F]/10"
                            onClick={() => { setEditingTicket(t); setTicketFormOpen(true); }}
                          >
                            <Edit3 size={17} className="text-[#2D6A9F]" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-9 w-9 hover:bg-red-50"
                            onClick={() => setDeletingTicket(t)}
                          >
                            <Trash2 size={17} className="text-red-400 hover:text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── CALENDAR VIEW ──────────────────────────────────────── */}
      {view === "calendario" && (
        <Card>
          <CardContent className="p-4">
            <CalendarView
              tickets={filterProperty === "__all__" ? tickets : tickets.filter((t) => t.property_id === filterProperty)}
              schedules={filteredSchedules}
              properties={properties}
              month={filterMonth}
              year={filterYear}
              month2={filterMonth2}
              year2={filterYear2}
              onEditTicket={(t) => { setEditingTicket(t); setCalDefaultDate(""); setTicketFormOpen(true); }}
              onCreateTicket={(date) => { setEditingTicket(null); setCalDefaultDate(date); setTicketFormOpen(true); }}
              onMoveTicket={async (ticket, newDate) => {
                try {
                  await updateTicket.mutateAsync({
                    id: ticket.id,
                    fecha_programada: newDate,
                    fecha_reporte: ticket.fecha_reporte === ticket.fecha_programada ? newDate : ticket.fecha_reporte,
                  });
                  toast({ title: "Ticket movido", description: `"${ticket.titulo}" → ${newDate}`, variant: "success" });
                } catch {
                  toast({ title: "Error al mover", description: "No se pudo mover el ticket.", variant: "destructive" });
                }
              }}
              reservations={allReservations}
              propertyFilter={filterProperty}
            />
          </CardContent>
        </Card>
      )}

      {/* ── PREVENTIVE VIEW ────────────────────────────────────── */}
      {view === "preventivo" && (
        <>
          {filteredSchedules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <RotateCcw size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No hay mantenimientos preventivos programados</p>
                <p className="text-xs text-muted-foreground mt-1">Programa tareas recurrentes como servicio de piscina, revisión de AC, etc.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredSchedules.map((s) => {
                const days = daysUntil(s.proxima_ejecucion);
                const isOverdue = days !== null && days < 0;
                const isDueSoon = days !== null && days >= 0 && days <= 3;
                return (
                  <Card key={s.id} className={cn(
                    "hover:shadow-md transition-shadow",
                    isOverdue && "border-red-200 bg-red-50/30",
                    isDueSoon && "border-amber-200 bg-amber-50/20",
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-sm text-[#0F2B4C]">{s.titulo}</h3>
                            <Badge variant="outline" className="text-[10px] px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                              Cada {s.frecuencia_dias} días
                            </Badge>
                            {daysUntilBadge(days)}
                            {!s.activo && (
                              <Badge variant="outline" className="text-[10px] px-1.5 bg-slate-100 text-slate-500">Inactivo</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            {filterProperty === "__all__" && (
                              <span className="flex items-center gap-1 font-semibold text-[#2D6A9F]">
                                <Building2 size={10} /> {propName(s.property_id)}
                              </span>
                            )}
                            <span className="font-medium">{s.categoria}</span>
                            {s.proxima_ejecucion && <span>Próxima: {s.proxima_ejecucion}</span>}
                            {s.tecnico_nombre && <span className="flex items-center gap-1"><User size={10} /> {s.tecnico_nombre}</span>}
                            {s.costo_estimado > 0 && <span className="font-mono">{fmtCurrency(s.costo_estimado, s.currency)}/vez</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost" size="icon" className="h-9 w-9 hover:bg-[#2D6A9F]/10"
                            onClick={() => { setEditingSchedule(s); setScheduleFormOpen(true); }}
                          >
                            <Edit3 size={17} className="text-[#2D6A9F]" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-9 w-9 hover:bg-red-50"
                            onClick={async () => {
                              await deleteSchedule.mutateAsync(s.id);
                              toast({ title: "Programación eliminada" });
                            }}
                          >
                            <Trash2 size={17} className="text-red-400 hover:text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Análisis view ─────────────────────────────────────── */}
      {view === "analisis" && (
        <div className="space-y-5">
          {chartBase.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No hay datos para analizar en este período</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Row 1: Estado donut + Prioridad donut + Asignación donut */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Estado */}
                <Card>
                  <CardContent className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                      Distribución por estado
                    </p>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={chartEstado} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value">
                          {chartEstado.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <RTooltip formatter={(v: any, n: any) => [v, n]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 mt-2">
                      {chartEstado.map((d) => (
                        <div key={d.name} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="font-bold text-[#0F2B4C]">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Prioridad */}
                <Card>
                  <CardContent className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                      Distribución por prioridad
                    </p>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={chartPrioridad} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value">
                          {chartPrioridad.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <RTooltip formatter={(v: any, n: any) => [v, n]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 mt-2">
                      {chartPrioridad.map((d) => (
                        <div key={d.name} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="font-bold text-[#0F2B4C]">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Asignación de costo */}
                <Card>
                  <CardContent className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                      Asignación de costo
                    </p>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={chartAsignacion} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value">
                          {chartAsignacion.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <RTooltip formatter={(v: any, n: any) => [v, n]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 mt-2">
                      {chartAsignacion.map((d) => (
                        <div key={d.name} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="font-bold text-[#0F2B4C]">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Row 2: Costos por categoría (bar chart) */}
              <Card>
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                    Costo por categoría
                  </p>
                  <ResponsiveContainer width="100%" height={Math.max(180, chartCategoria.length * 38)}>
                    <BarChart data={chartCategoria} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtCurrency(v, "DOP")} />
                      <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} width={130} />
                      <RTooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload?.[0]) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-[#0B1F38] text-white rounded-lg px-3 py-2 text-[11px] shadow-xl border border-white/10">
                              <p className="font-bold mb-1">{d.categoria}</p>
                              <p>Tickets: <span className="font-mono">{d.tickets}</span></p>
                              <p>Costo: <span className="font-mono font-bold text-[#F0A030]">{fmtCurrency(d.costo, "DOP")}</span></p>
                            </div>
                          );
                        }}
                        cursor={{ fill: "#0F2B4C08" }}
                      />
                      <Bar dataKey="costo" radius={[0, 4, 4, 0]}>
                        {chartCategoria.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? "#0F2B4C" : "#2D6A9F"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Row 3: Tickets por propiedad (only when "Todas") */}
              {chartPropiedad.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                      Tickets por propiedad
                    </p>
                    <ResponsiveContainer width="100%" height={Math.max(160, chartPropiedad.length * 44)}>
                      <BarChart data={chartPropiedad} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} width={140} />
                        <RTooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.[0]) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-[#0B1F38] text-white rounded-lg px-3 py-2 text-[11px] shadow-xl border border-white/10">
                                <p className="font-bold mb-1">{d.name}</p>
                                <p>Tickets: <span className="font-mono">{d.tickets}</span></p>
                                <p>Costo: <span className="font-mono font-bold text-[#F0A030]">{fmtCurrency(d.costo, "DOP")}</span></p>
                              </div>
                            );
                          }}
                          cursor={{ fill: "#0F2B4C06" }}
                        />
                        <Bar dataKey="tickets" radius={[0, 4, 4, 0]}>
                          {chartPropiedad.map((_, i) => <Cell key={i} fill={PROP_COLORS[i % PROP_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Dialogs ──────────────────────────────────────────── */}
      <TicketFormDialog
        open={ticketFormOpen}
        onOpenChange={(v) => { setTicketFormOpen(v); if (!v) { setEditingTicket(null); setCalDefaultDate(""); } }}
        editing={editingTicket}
        propertyId={filterProperty !== "__all__" ? filterProperty : ""}
        properties={properties}
        onSave={handleSaveTicket}
        saving={createTicket.isPending || updateTicket.isPending}
        defaultDate={calDefaultDate}
        reservations={allReservations}
      />

      <ScheduleFormDialog
        open={scheduleFormOpen}
        onOpenChange={(v) => { setScheduleFormOpen(v); if (!v) setEditingSchedule(null); }}
        editing={editingSchedule}
        propertyId={filterProperty !== "__all__" ? filterProperty : ""}
        properties={properties}
        onSave={handleSaveSchedule}
        saving={createSchedule.isPending || updateSchedule.isPending}
      />

      {/* ── Delete confirmation ───────────────────────────────── */}
      <Dialog open={!!deletingTicket} onOpenChange={() => setDeletingTicket(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              Eliminar ticket
            </DialogTitle>
            <DialogDescription>
              ¿Eliminar el ticket "{deletingTicket?.titulo}"? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTicket(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteTicket} disabled={deleteTicket.isPending}>
              {deleteTicket.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit confirmation ──────────────────────────────── */}
      <Dialog open={!!confirmingEdit} onOpenChange={() => setConfirmingEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 size={18} className="text-[#2D6A9F]" />
              Confirmar cambios
            </DialogTitle>
            <DialogDescription>
              ¿Guardar los cambios en el ticket "{editingTicket?.titulo}"?
              {confirmingEdit?.estado === "Resuelto" && confirmingEdit?.asignacion_costo !== "incluido" && (confirmingEdit?.costo_real > 0 || confirmingEdit?.costo_estimado > 0) && !editingTicket?.charge_id && (
                <span className="block mt-2 text-violet-700 font-medium">
                  Se sincronizará automáticamente con {confirmingEdit?.asignacion_costo === "cana_escapes" ? "gastos de Cana Escapes" : "cargos al propietario"} por {fmtCurrency(confirmingEdit?.costo_real > 0 ? confirmingEdit.costo_real : confirmingEdit.costo_estimado, confirmingEdit?.currency ?? "DOP")}.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingEdit(null)}>Cancelar</Button>
            <Button
              onClick={() => doSaveTicket(confirmingEdit)}
              disabled={updateTicket.isPending || syncToCharge.isPending}
            >
              {updateTicket.isPending ? "Guardando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Hover Tooltip ──────────────────────────────────── */}
      {hoveredTicket && !ticketFormOpen && !deletingTicket && !confirmingEdit && (
        <TicketTooltip
          t={hoveredTicket}
          x={tooltipPos.x}
          y={tooltipPos.y}
          propName={propName(hoveredTicket.property_id)}
        />
      )}
    </div>
    </div>
  );
}
