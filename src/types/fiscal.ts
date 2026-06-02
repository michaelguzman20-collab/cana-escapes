export interface FiscalConfig {
  id: string;
  rnc: string;
  razon_social: string;
  nombre_comercial: string;
  actividad_economica: string;
  regimen: string;
  fecha_cierre_fiscal: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface NcfSequence {
  id: string;
  tipo_comprobante: string;
  nombre: string;
  prefijo: string;
  secuencia_actual: number;
  secuencia_desde: number;
  secuencia_hasta: number;
  fecha_vencimiento: string | null;
  activo: boolean;
  created_at: string;
}

export interface FiscalInvoice {
  id: string;
  property_id: string | null;
  ncf: string;
  ncf_modificado: string | null;
  tipo_ncf: string;
  tipo_ingreso: string;
  fecha: string;
  cliente_rnc: string | null;
  cliente_tipo_id: number;
  cliente_nombre: string | null;
  monto_gravado_18: number;
  monto_gravado_16: number;
  monto_exento: number;
  itbis_facturado: number;
  itbis_percibido: number;
  isc: number;
  otros_impuestos: number;
  propina_legal: number;
  monto_efectivo: number;
  monto_cheque_transferencia: number;
  monto_tarjeta: number;
  monto_credito: number;
  monto_bonos: number;
  monto_permuta: number;
  monto_otras_formas: number;
  retencion_itbis_terceros: number;
  retencion_isr_terceros: number;
  total_facturado: number;
  currency: string;
  exchange_rate: number;
  status: string;
  anulacion_tipo: string | null;
  notas: string | null;
  created_at: string;
}

export type FiscalInvoiceInsert = Omit<FiscalInvoice, "id" | "created_at">;

export interface FiscalExpense {
  id: string;
  property_id: string | null;
  ncf: string;
  ncf_modificado: string | null;
  tipo_gasto: string;
  fecha_comprobante: string;
  fecha_pago: string | null;
  proveedor_rnc: string;
  proveedor_tipo_id: number;
  proveedor_nombre: string | null;
  monto_facturado_servicios: number;
  monto_facturado_bienes: number;
  total_facturado: number;
  itbis_facturado: number;
  itbis_retenido: number;
  itbis_sujeto_proporcionalidad: number;
  itbis_llevado_costo: number;
  itbis_por_adelantar: number;
  itbis_percibido_compras: number;
  tipo_retencion_isr: string | null;
  isr_retenido: number;
  isc: number;
  otros_impuestos: number;
  propina_legal: number;
  forma_pago: string;
  currency: string;
  exchange_rate: number;
  status: string;
  anulacion_tipo: string | null;
  notas: string | null;
  created_at: string;
}

export type FiscalExpenseInsert = Omit<FiscalExpense, "id" | "created_at">;

export interface FiscalRetention {
  id: string;
  property_id: string | null;
  tipo: string;
  concepto: string;
  beneficiario_rnc: string;
  beneficiario_tipo_id: number;
  beneficiario_nombre: string | null;
  fecha: string;
  monto_base: number;
  tasa_retencion: number;
  monto_retenido: number;
  ncf_relacionado: string | null;
  periodo_mes: number;
  periodo_year: number;
  status: string;
  notas: string | null;
  created_at: string;
}

export type FiscalRetentionInsert = Omit<FiscalRetention, "id" | "created_at">;

// Constants for DGII codes
export const TIPOS_NCF = [
  { code: "E31", name: "Factura de Crédito Fiscal" },
  { code: "E32", name: "Factura de Consumo" },
  { code: "E33", name: "Nota de Débito" },
  { code: "E34", name: "Nota de Crédito" },
  { code: "E41", name: "Comprobante de Compras" },
  { code: "E43", name: "Comprobante de Gastos Menores" },
  { code: "E45", name: "Comprobante Gubernamental" },
] as const;

export const TIPOS_INGRESO = [
  { code: "01", name: "Ingresos por Operaciones (No Financieros)" },
  { code: "02", name: "Ingresos Financieros" },
  { code: "03", name: "Ingresos Extraordinarios" },
  { code: "04", name: "Ingresos por Arrendamientos" },
  { code: "05", name: "Ingresos por Venta de Activo Depreciable" },
  { code: "06", name: "Otros Ingresos" },
] as const;

export const TIPOS_GASTO = [
  { code: "01", name: "Gastos de Personal" },
  { code: "02", name: "Gastos por Trabajos, Suministros y Servicios" },
  { code: "03", name: "Arrendamientos" },
  { code: "04", name: "Gastos de Activos Fijos" },
  { code: "05", name: "Gastos de Representación" },
  { code: "06", name: "Gastos Financieros" },
  { code: "07", name: "Gastos de Seguros" },
  { code: "08", name: "Gastos de Conservación, Reparaciones y Sostenimiento" },
  { code: "09", name: "Gastos de Viaje" },
  { code: "10", name: "Gastos de Oficina e Informática" },
  { code: "11", name: "Gastos de Publicidad y Propaganda" },
] as const;

export const FORMAS_PAGO = [
  { code: "01", name: "Efectivo" },
  { code: "02", name: "Cheques/Transferencias/Depósito" },
  { code: "03", name: "Tarjeta Crédito/Débito" },
  { code: "04", name: "Compra a Crédito" },
  { code: "05", name: "Permuta" },
  { code: "06", name: "Nota de Crédito" },
  { code: "07", name: "Mixto" },
] as const;

export const TIPOS_RETENCION_ISR = [
  { code: "01", name: "Alquileres" },
  { code: "02", name: "Honorarios por servicios" },
  { code: "03", name: "Otras rentas" },
  { code: "04", name: "Otras rentas (Presunción de renta)" },
  { code: "05", name: "Intereses pagados a personas jurídicas residentes" },
  { code: "06", name: "Intereses pagados a personas físicas residentes" },
  { code: "07", name: "Retención por Proveedores del Estado" },
  { code: "08", name: "Juegos telefónicos" },
] as const;

// ── Accounting types ────────────────────────────────────────────
export interface ChartAccount {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  naturaleza: string;
  nivel: number;
  cuenta_padre: string | null;
  acepta_movimientos: boolean;
  descripcion: string | null;
  activa: boolean;
  created_at: string;
}

export type ChartAccountInsert = Omit<ChartAccount, "id" | "created_at">;

export interface JournalEntry {
  id: string;
  numero: number;
  fecha: string;
  descripcion: string;
  referencia: string | null;
  tipo: string;
  property_id: string | null;
  source_invoice_id: string | null;
  source_expense_id: string | null;
  source_retention_id: string | null;
  status: string;
  total_debito: number;
  total_credito: number;
  created_at: string;
}

export type JournalEntryInsert = Omit<JournalEntry, "id" | "numero" | "created_at">;

export interface JournalEntryLine {
  id: string;
  entry_id: string;
  cuenta_codigo: string;
  descripcion: string | null;
  debito: number;
  credito: number;
  created_at: string;
}

export type JournalEntryLineInsert = Omit<JournalEntryLine, "id" | "created_at">;

export const CODIGOS_ANULACION = [
  { code: "04", name: "Duplicidad de facturas" },
  { code: "05", name: "Corrección de la información" },
  { code: "06", name: "Cambio del tipo de comprobante" },
  { code: "09", name: "Error de sistemas" },
] as const;

export const CONCEPTOS_RETENCION = [
  { value: "Honorarios profesionales", tasaISR: 10, tasaITBIS: 100 },
  { value: "Alquiler bienes muebles", tasaISR: 10, tasaITBIS: 100 },
  { value: "Alquiler bienes inmuebles", tasaISR: 10, tasaITBIS: 100 },
  { value: "Servicios persona física", tasaISR: 10, tasaITBIS: 100 },
  { value: "Servicios persona jurídica", tasaISR: 0, tasaITBIS: 30 },
  { value: "Dividendos persona física", tasaISR: 10, tasaITBIS: 0 },
  { value: "Intereses persona física", tasaISR: 10, tasaITBIS: 0 },
  { value: "Premios y ganancias", tasaISR: 15, tasaITBIS: 0 },
] as const;
