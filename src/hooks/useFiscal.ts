import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type {
  FiscalInvoice, FiscalInvoiceInsert,
  FiscalExpense, FiscalExpenseInsert,
  FiscalRetention, FiscalRetentionInsert,
  FiscalConfig, NcfSequence,
  ChartAccount, ChartAccountInsert,
  JournalEntry, JournalEntryInsert,
  JournalEntryLine, JournalEntryLineInsert,
} from "@/types/fiscal";

// Helper: supabase client doesn't have these tables in the generated types yet
const db = supabase as any;

// ── Fiscal Config ─────────────────────────────────────────────────
export function useFiscalConfig() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["fiscal_config"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("fiscal_config")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as FiscalConfig;
    },
  });
}

export function useUpdateFiscalConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: Partial<FiscalConfig> & { id: string }) => {
      const { id, ...rest } = config;
      const { error } = await db
        .from("fiscal_config")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fiscal_config"] }),
  });
}

// ── NCF Sequences ─────────────────────────────────────────────────
export function useNcfSequences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ncf_sequences"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("ncf_sequences")
        .select("*")
        .order("tipo_comprobante");
      if (error) throw error;
      return data as NcfSequence[];
    },
  });
}

export function useNextNcf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tipoComprobante: string) => {
      const { data: seq, error: fetchErr } = await db
        .from("ncf_sequences")
        .select("*")
        .eq("tipo_comprobante", tipoComprobante)
        .eq("activo", true)
        .single();
      if (fetchErr) throw fetchErr;

      const next = (seq.secuencia_actual as number) + 1;
      if (next > seq.secuencia_hasta) throw new Error("Secuencia NCF agotada");

      const { error: updateErr } = await db
        .from("ncf_sequences")
        .update({ secuencia_actual: next })
        .eq("id", seq.id);
      if (updateErr) throw updateErr;

      const ncf = `${seq.prefijo}${String(next).padStart(10, "0")}`;
      return ncf;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ncf_sequences"] }),
  });
}

export function useUpdateNcfSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (update: Partial<NcfSequence> & { id: string }) => {
      const { id, ...rest } = update;
      const { error } = await db
        .from("ncf_sequences")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ncf_sequences"] }),
  });
}

// ── Fiscal Invoices (607 - Ingresos) ──────────────────────────────
export function useFiscalInvoices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["fiscal_invoices"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("fiscal_invoices")
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data as FiscalInvoice[];
    },
  });
}

export function useCreateFiscalInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: FiscalInvoiceInsert) => {
      const { data, error } = await db
        .from("fiscal_invoices")
        .insert(invoice as any)
        .select()
        .single();
      if (error) throw error;
      return data as FiscalInvoice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fiscal_invoices"] }),
  });
}

export function useUpdateFiscalInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...invoice }: Partial<FiscalInvoiceInsert> & { id: string }) => {
      const { error } = await db
        .from("fiscal_invoices")
        .update(invoice)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fiscal_invoices"] }),
  });
}

export function useDeleteFiscalInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("fiscal_invoices")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fiscal_invoices"] }),
  });
}

// ── Fiscal Expenses (606 - Gastos) ────────────────────────────────
export function useFiscalExpenses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["fiscal_expenses"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("fiscal_expenses")
        .select("*")
        .order("fecha_comprobante", { ascending: false });
      if (error) throw error;
      return data as FiscalExpense[];
    },
  });
}

export function useCreateFiscalExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expense: FiscalExpenseInsert) => {
      const { data, error } = await db
        .from("fiscal_expenses")
        .insert(expense as any)
        .select()
        .single();
      if (error) throw error;
      return data as FiscalExpense;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fiscal_expenses"] }),
  });
}

export function useUpdateFiscalExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...expense }: Partial<FiscalExpenseInsert> & { id: string }) => {
      const { error } = await db
        .from("fiscal_expenses")
        .update(expense)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fiscal_expenses"] }),
  });
}

export function useDeleteFiscalExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("fiscal_expenses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fiscal_expenses"] }),
  });
}

// ── Fiscal Retentions (IR-17) ─────────────────────────────────────
export function useFiscalRetentions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["fiscal_retentions"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("fiscal_retentions")
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data as FiscalRetention[];
    },
  });
}

export function useCreateFiscalRetention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (retention: FiscalRetentionInsert) => {
      const { data, error } = await db
        .from("fiscal_retentions")
        .insert(retention as any)
        .select()
        .single();
      if (error) throw error;
      return data as FiscalRetention;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fiscal_retentions"] }),
  });
}

export function useUpdateFiscalRetention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...retention }: Partial<FiscalRetentionInsert> & { id: string }) => {
      const { error } = await db
        .from("fiscal_retentions")
        .update(retention)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fiscal_retentions"] }),
  });
}

export function useDeleteFiscalRetention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("fiscal_retentions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fiscal_retentions"] }),
  });
}

// ── Chart of Accounts ────────────────────────────────────────────
export function useChartOfAccounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chart_of_accounts"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("chart_of_accounts")
        .select("*")
        .order("codigo");
      if (error) throw error;
      return data as ChartAccount[];
    },
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (account: ChartAccountInsert) => {
      const { data, error } = await db
        .from("chart_of_accounts")
        .insert(account as any)
        .select()
        .single();
      if (error) throw error;
      return data as ChartAccount;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chart_of_accounts"] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<ChartAccountInsert> & { id: string }) => {
      const { error } = await db
        .from("chart_of_accounts")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chart_of_accounts"] }),
  });
}

// ── Journal Entries ──────────────────────────────────────────────
export function useJournalEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["journal_entries"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("journal_entries")
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data as JournalEntry[];
    },
  });
}

export function useJournalEntryLines(entryId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["journal_entry_lines", entryId],
    enabled: !!user && !!entryId,
    queryFn: async () => {
      const { data, error } = await db
        .from("journal_entry_lines")
        .select("*")
        .eq("entry_id", entryId)
        .order("created_at");
      if (error) throw error;
      return data as JournalEntryLine[];
    },
  });
}

export function useAllJournalEntryLines() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["journal_entry_lines_all"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("journal_entry_lines")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as JournalEntryLine[];
    },
  });
}

export function useCreateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entry,
      lines,
    }: {
      entry: JournalEntryInsert;
      lines: Omit<JournalEntryLineInsert, "entry_id">[];
    }) => {
      const { data: created, error: entryErr } = await db
        .from("journal_entries")
        .insert(entry as any)
        .select()
        .single();
      if (entryErr) throw entryErr;

      const entryLines = lines.map((l) => ({ ...l, entry_id: created.id }));
      const { error: linesErr } = await db
        .from("journal_entry_lines")
        .insert(entryLines as any);
      if (linesErr) throw linesErr;

      return created as JournalEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal_entries"] });
      qc.invalidateQueries({ queryKey: ["journal_entry_lines_all"] });
    },
  });
}

export function useUpdateJournalEntryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db
        .from("journal_entries")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journal_entries"] }),
  });
}

// ── Seed sample data ─────────────────────────────────────────────
export function useSeedFiscalData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const invoices = [
        { ncf: "E310000000001", tipo_ncf: "E31", tipo_ingreso: "01", fecha: "2026-05-03", cliente_rnc: "131098585", cliente_tipo_id: 1, cliente_nombre: "Booking Holdings DR SRL", monto_gravado_18: 85000, monto_gravado_16: 0, monto_exento: 0, itbis_facturado: 15300, total_facturado: 100300, monto_cheque_transferencia: 100300, currency: "DOP", status: "Activa" },
        { ncf: "E320000000001", tipo_ncf: "E32", tipo_ingreso: "01", fecha: "2026-05-05", cliente_rnc: "40212345678", cliente_tipo_id: 2, cliente_nombre: "Carlos Méndez", monto_gravado_18: 45000, monto_gravado_16: 0, monto_exento: 0, itbis_facturado: 8100, total_facturado: 53100, monto_tarjeta: 53100, currency: "DOP", status: "Activa" },
        { ncf: "E320000000002", tipo_ncf: "E32", tipo_ingreso: "01", fecha: "2026-05-08", cliente_tipo_id: 2, cliente_nombre: "John Smith", monto_gravado_18: 120000, monto_gravado_16: 0, monto_exento: 0, itbis_facturado: 21600, total_facturado: 141600, monto_efectivo: 50000, monto_tarjeta: 91600, currency: "DOP", status: "Activa" },
        { ncf: "E310000000002", tipo_ncf: "E31", tipo_ingreso: "01", fecha: "2026-05-10", cliente_rnc: "130567890", cliente_tipo_id: 1, cliente_nombre: "Caribe Tours Vacation SRL", monto_gravado_18: 200000, monto_gravado_16: 0, monto_exento: 0, itbis_facturado: 36000, total_facturado: 236000, monto_cheque_transferencia: 236000, currency: "DOP", status: "Activa" },
        { ncf: "E320000000003", tipo_ncf: "E32", tipo_ingreso: "01", fecha: "2026-05-12", cliente_rnc: "00114567890", cliente_tipo_id: 2, cliente_nombre: "María García", monto_gravado_18: 35000, monto_gravado_16: 0, monto_exento: 0, itbis_facturado: 6300, total_facturado: 41300, monto_tarjeta: 41300, currency: "DOP", status: "Activa" },
        { ncf: "E340000000001", ncf_modificado: "E310000000001", tipo_ncf: "E34", tipo_ingreso: "01", fecha: "2026-05-14", cliente_rnc: "131098585", cliente_tipo_id: 1, cliente_nombre: "Booking Holdings DR SRL", monto_gravado_18: 10000, monto_gravado_16: 0, monto_exento: 0, itbis_facturado: 1800, total_facturado: 11800, monto_cheque_transferencia: 11800, currency: "DOP", status: "Activa" },
      ];

      const expenses = [
        { ncf: "B0100004521", tipo_gasto: "02", fecha_comprobante: "2026-05-02", fecha_pago: "2026-05-02", proveedor_rnc: "40298765432", proveedor_tipo_id: 2, proveedor_nombre: "Rosa Martínez (Limpieza)", monto_facturado_servicios: 18000, monto_facturado_bienes: 0, total_facturado: 18000, itbis_facturado: 3240, itbis_retenido: 3240, isr_retenido: 1800, forma_pago: "01", currency: "DOP", status: "Pagado" },
        { ncf: "E310000045678", tipo_gasto: "08", fecha_comprobante: "2026-05-04", fecha_pago: "2026-05-05", proveedor_rnc: "130789456", proveedor_tipo_id: 1, proveedor_nombre: "Pool Masters SRL", monto_facturado_servicios: 12500, monto_facturado_bienes: 5000, total_facturado: 17500, itbis_facturado: 3150, forma_pago: "02", currency: "DOP", status: "Pagado" },
        { ncf: "E310000123456", tipo_gasto: "02", fecha_comprobante: "2026-05-01", fecha_pago: "2026-05-15", proveedor_rnc: "101012345", proveedor_tipo_id: 1, proveedor_nombre: "Altice Dominicana SA", monto_facturado_servicios: 8500, monto_facturado_bienes: 0, total_facturado: 8500, itbis_facturado: 1530, forma_pago: "02", currency: "DOP", status: "Pagado" },
        { ncf: "E310000098765", tipo_gasto: "02", fecha_comprobante: "2026-05-05", fecha_pago: "2026-05-10", proveedor_rnc: "101500123", proveedor_tipo_id: 1, proveedor_nombre: "CEPM (Consorcio Energético)", monto_facturado_servicios: 22000, monto_facturado_bienes: 0, total_facturado: 22000, itbis_facturado: 3960, forma_pago: "02", currency: "DOP", status: "Pagado" },
        { ncf: "B0100007890", tipo_gasto: "08", fecha_comprobante: "2026-05-07", fecha_pago: "2026-05-07", proveedor_rnc: "40287654321", proveedor_tipo_id: 2, proveedor_nombre: "Pedro Sánchez (Técnico AC)", monto_facturado_servicios: 15000, monto_facturado_bienes: 8000, total_facturado: 23000, itbis_facturado: 4140, itbis_retenido: 4140, isr_retenido: 2300, tipo_retencion_isr: "02", forma_pago: "01", currency: "DOP", status: "Pagado" },
        { ncf: "E310000055555", tipo_gasto: "02", fecha_comprobante: "2026-05-09", proveedor_rnc: "131234567", proveedor_tipo_id: 1, proveedor_nombre: "Distribuidora El Hogar SRL", monto_facturado_servicios: 0, monto_facturado_bienes: 9500, total_facturado: 9500, itbis_facturado: 1710, forma_pago: "03", currency: "DOP", status: "Registrado" },
        { ncf: "E310000033333", tipo_gasto: "07", fecha_comprobante: "2026-05-01", fecha_pago: "2026-05-01", proveedor_rnc: "101678900", proveedor_tipo_id: 1, proveedor_nombre: "Seguros Universal SA", monto_facturado_servicios: 45000, monto_facturado_bienes: 0, total_facturado: 45000, itbis_facturado: 0, forma_pago: "02", currency: "DOP", status: "Pagado" },
        { ncf: "E310000077777", tipo_gasto: "11", fecha_comprobante: "2026-05-11", proveedor_rnc: "130999888", proveedor_tipo_id: 1, proveedor_nombre: "Digital Marketing Caribe SRL", monto_facturado_servicios: 25000, monto_facturado_bienes: 0, total_facturado: 25000, itbis_facturado: 4500, forma_pago: "02", currency: "DOP", status: "Registrado" },
      ];

      const retentions = [
        { tipo: "ISR", concepto: "Servicios persona física", beneficiario_rnc: "40298765432", beneficiario_tipo_id: 2, beneficiario_nombre: "Rosa Martínez", fecha: "2026-05-02", monto_base: 18000, tasa_retencion: 10, monto_retenido: 1800, ncf_relacionado: "B0100004521", periodo_mes: 5, periodo_year: 2026, status: "Pendiente" },
        { tipo: "ITBIS", concepto: "Servicios persona física", beneficiario_rnc: "40298765432", beneficiario_tipo_id: 2, beneficiario_nombre: "Rosa Martínez", fecha: "2026-05-02", monto_base: 3240, tasa_retencion: 100, monto_retenido: 3240, ncf_relacionado: "B0100004521", periodo_mes: 5, periodo_year: 2026, status: "Pendiente" },
        { tipo: "ISR", concepto: "Honorarios profesionales", beneficiario_rnc: "40287654321", beneficiario_tipo_id: 2, beneficiario_nombre: "Pedro Sánchez", fecha: "2026-05-07", monto_base: 23000, tasa_retencion: 10, monto_retenido: 2300, ncf_relacionado: "B0100007890", periodo_mes: 5, periodo_year: 2026, status: "Pendiente" },
        { tipo: "ITBIS", concepto: "Servicios persona física", beneficiario_rnc: "40287654321", beneficiario_tipo_id: 2, beneficiario_nombre: "Pedro Sánchez", fecha: "2026-05-07", monto_base: 4140, tasa_retencion: 100, monto_retenido: 4140, ncf_relacionado: "B0100007890", periodo_mes: 5, periodo_year: 2026, status: "Pendiente" },
        { tipo: "ITBIS", concepto: "Servicios persona jurídica", beneficiario_rnc: "130999888", beneficiario_tipo_id: 1, beneficiario_nombre: "Digital Marketing Caribe SRL", fecha: "2026-05-11", monto_base: 4500, tasa_retencion: 30, monto_retenido: 1350, ncf_relacionado: "E310000077777", periodo_mes: 5, periodo_year: 2026, status: "Pendiente" },
      ];

      // Update NCF sequences
      await db.from("ncf_sequences").update({ secuencia_actual: 5 }).eq("tipo_comprobante", "E31");
      await db.from("ncf_sequences").update({ secuencia_actual: 12 }).eq("tipo_comprobante", "E32");
      await db.from("ncf_sequences").update({ secuencia_actual: 1 }).eq("tipo_comprobante", "E34");

      // Insert invoices
      const { error: invErr } = await db.from("fiscal_invoices").insert(invoices);
      if (invErr) throw invErr;

      // Insert expenses
      const { error: expErr } = await db.from("fiscal_expenses").insert(expenses);
      if (expErr) throw expErr;

      // Insert retentions
      const { error: retErr } = await db.from("fiscal_retentions").insert(retentions);
      if (retErr) throw retErr;

      return { invoices: invoices.length, expenses: expenses.length, retentions: retentions.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fiscal_invoices"] });
      qc.invalidateQueries({ queryKey: ["fiscal_expenses"] });
      qc.invalidateQueries({ queryKey: ["fiscal_retentions"] });
      qc.invalidateQueries({ queryKey: ["ncf_sequences"] });
    },
  });
}
