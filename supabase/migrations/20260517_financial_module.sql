-- ══════════════════════════════════════════════════════════════════
-- Financial / Accounting Module — DGII Compliance
-- Company: CanaEscapes | RNC: 133-70382-3
-- ══════════════════════════════════════════════════════════════════

-- Fiscal configuration (company data, RNC, regime, etc.)
create table if not exists public.fiscal_config (
  id            uuid primary key default gen_random_uuid(),
  rnc           text not null default '133703823',
  razon_social  text not null default 'CanaEscapes',
  nombre_comercial text not null default 'Cana Escapes',
  actividad_economica text not null default 'Alquiler de propiedades vacacionales',
  regimen       text not null default 'Regular', -- Regular, RST
  fecha_cierre_fiscal text not null default '31/12',
  direccion     text,
  telefono      text,
  email         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- NCF/e-CF sequence management
create table if not exists public.ncf_sequences (
  id            uuid primary key default gen_random_uuid(),
  tipo_comprobante text not null, -- E31, E32, E33, E34, E41, E43, E45
  nombre        text not null, -- Factura Crédito Fiscal, Factura Consumo, etc.
  prefijo       text not null, -- E31, E32, etc.
  secuencia_actual bigint not null default 0,
  secuencia_desde bigint not null default 1,
  secuencia_hasta bigint not null default 9999999999,
  fecha_vencimiento date,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Invoices (Ingresos / 607) — manual income entries
create table if not exists public.fiscal_invoices (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid references public.properties(id),
  ncf             text not null, -- NCF or e-CF number
  ncf_modificado  text, -- if nota de crédito applies
  tipo_ncf        text not null default 'E32', -- E31, E32, E33, E34
  tipo_ingreso    text not null default '02', -- 01=Financieros, 02=Operacionales, 03=Extraordinarios
  fecha           date not null default current_date,
  -- Client info
  cliente_rnc     text, -- RNC or cédula
  cliente_tipo_id int not null default 2, -- 1=RNC, 2=Cédula, 3=Pasaporte
  cliente_nombre  text,
  -- Amounts
  monto_gravado_18 numeric(18,2) not null default 0,
  monto_gravado_16 numeric(18,2) not null default 0,
  monto_exento    numeric(18,2) not null default 0,
  itbis_facturado numeric(18,2) not null default 0,
  itbis_percibido numeric(18,2) not null default 0,
  isc             numeric(18,2) not null default 0,
  otros_impuestos numeric(18,2) not null default 0,
  propina_legal   numeric(18,2) not null default 0,
  -- Payment breakdown (for 607)
  monto_efectivo  numeric(18,2) not null default 0,
  monto_cheque_transferencia numeric(18,2) not null default 0,
  monto_tarjeta   numeric(18,2) not null default 0,
  monto_credito   numeric(18,2) not null default 0,
  monto_bonos     numeric(18,2) not null default 0,
  monto_permuta   numeric(18,2) not null default 0,
  monto_otras_formas numeric(18,2) not null default 0,
  -- Retentions received from third parties
  retencion_itbis_terceros numeric(18,2) not null default 0,
  retencion_isr_terceros numeric(18,2) not null default 0,
  -- Computed
  total_facturado numeric(18,2) not null default 0,
  -- Metadata
  currency      text not null default 'DOP',
  exchange_rate numeric(10,2) not null default 1,
  status        text not null default 'Activa', -- Activa, Anulada, Pagada
  anulacion_tipo text, -- 04, 05, 06, 09 (códigos DGII)
  notas         text,
  created_at    timestamptz not null default now()
);

-- Expenses (Gastos / 606) — manual expense entries
create table if not exists public.fiscal_expenses (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid references public.properties(id),
  ncf             text not null,
  ncf_modificado  text,
  tipo_gasto      text not null default '02', -- 01-11 DGII codes
  fecha_comprobante date not null default current_date,
  fecha_pago      date,
  -- Supplier info
  proveedor_rnc   text not null,
  proveedor_tipo_id int not null default 1, -- 1=RNC, 2=Cédula, 3=Pasaporte
  proveedor_nombre text,
  -- Amounts
  monto_facturado_servicios numeric(18,2) not null default 0,
  monto_facturado_bienes numeric(18,2) not null default 0,
  total_facturado numeric(18,2) not null default 0,
  itbis_facturado numeric(18,2) not null default 0,
  itbis_retenido  numeric(18,2) not null default 0,
  itbis_sujeto_proporcionalidad numeric(18,2) not null default 0,
  itbis_llevado_costo numeric(18,2) not null default 0,
  itbis_por_adelantar numeric(18,2) not null default 0,
  itbis_percibido_compras numeric(18,2) not null default 0,
  -- ISR retention
  tipo_retencion_isr text, -- DGII codes
  isr_retenido    numeric(18,2) not null default 0,
  -- Other taxes
  isc             numeric(18,2) not null default 0,
  otros_impuestos numeric(18,2) not null default 0,
  propina_legal   numeric(18,2) not null default 0,
  -- Payment
  forma_pago      text not null default '01', -- 01=Efectivo, 02=Cheque/Transferencia, 03=Tarjeta, 04=Crédito, 05=Permuta, 06=Bonos, 07=Otro
  -- Metadata
  currency        text not null default 'DOP',
  exchange_rate   numeric(10,2) not null default 1,
  status          text not null default 'Registrado', -- Registrado, Pagado, Anulado
  anulacion_tipo  text,
  notas           text,
  created_at      timestamptz not null default now()
);

-- Retentions (IR-17) — withholdings applied to third parties
create table if not exists public.fiscal_retentions (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid references public.properties(id),
  tipo            text not null, -- ISR, ITBIS
  concepto        text not null, -- Honorarios, Alquiler, Servicios, etc.
  beneficiario_rnc text not null,
  beneficiario_tipo_id int not null default 1,
  beneficiario_nombre text,
  fecha           date not null default current_date,
  monto_base      numeric(18,2) not null default 0,
  tasa_retencion  numeric(5,2) not null default 0,
  monto_retenido  numeric(18,2) not null default 0,
  ncf_relacionado text,
  periodo_mes     int not null,
  periodo_year    int not null,
  status          text not null default 'Pendiente', -- Pendiente, Declarado, Pagado
  notas           text,
  created_at      timestamptz not null default now()
);

-- ══ RLS ══════════════════════════════════════════════════════════════
alter table public.fiscal_config enable row level security;
alter table public.ncf_sequences enable row level security;
alter table public.fiscal_invoices enable row level security;
alter table public.fiscal_expenses enable row level security;
alter table public.fiscal_retentions enable row level security;

-- Admin-only policies (same pattern as charges)
create policy "fiscal_config_admin" on public.fiscal_config
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "ncf_sequences_admin" on public.ncf_sequences
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "fiscal_invoices_admin" on public.fiscal_invoices
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "fiscal_expenses_admin" on public.fiscal_expenses
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "fiscal_retentions_admin" on public.fiscal_retentions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ══ Seed NCF sequences ══════════════════════════════════════════════
insert into public.ncf_sequences (tipo_comprobante, nombre, prefijo) values
  ('E31', 'Factura de Crédito Fiscal', 'E31'),
  ('E32', 'Factura de Consumo', 'E32'),
  ('E33', 'Nota de Débito', 'E33'),
  ('E34', 'Nota de Crédito', 'E34'),
  ('E41', 'Comprobante de Compras', 'E41'),
  ('E43', 'Comprobante de Gastos Menores', 'E43'),
  ('E45', 'Comprobante Gubernamental', 'E45');

-- ══ Seed fiscal config ══════════════════════════════════════════════
insert into public.fiscal_config (rnc, razon_social, nombre_comercial, actividad_economica)
values ('133703823', 'CanaEscapes', 'Cana Escapes', 'Alquiler de propiedades vacacionales')
on conflict do nothing;

-- ══════════════════════════════════════════════════════════════════
-- Sample data — Mayo 2026
-- ══════════════════════════════════════════════════════════════════

-- Update NCF sequences to simulate usage
update public.ncf_sequences set secuencia_actual = 5 where tipo_comprobante = 'E31';
update public.ncf_sequences set secuencia_actual = 12 where tipo_comprobante = 'E32';
update public.ncf_sequences set secuencia_actual = 1 where tipo_comprobante = 'E34';

-- ── Sample Invoices (Ingresos / 607) ────────────────────────────────

insert into public.fiscal_invoices (
  ncf, tipo_ncf, tipo_ingreso, fecha,
  cliente_rnc, cliente_tipo_id, cliente_nombre,
  monto_gravado_18, monto_gravado_16, monto_exento,
  itbis_facturado, total_facturado,
  monto_cheque_transferencia, currency, status
) values (
  'E310000000001', 'E31', '01', '2026-05-03',
  '131098585', 1, 'Booking Holdings DR SRL',
  85000.00, 0, 0,
  15300.00, 100300.00,
  100300.00, 'DOP', 'Activa'
);

insert into public.fiscal_invoices (
  ncf, tipo_ncf, tipo_ingreso, fecha,
  cliente_rnc, cliente_tipo_id, cliente_nombre,
  monto_gravado_18, monto_gravado_16, monto_exento,
  itbis_facturado, total_facturado,
  monto_tarjeta, currency, status
) values (
  'E320000000001', 'E32', '01', '2026-05-05',
  '40212345678', 2, 'Carlos Méndez',
  45000.00, 0, 0,
  8100.00, 53100.00,
  53100.00, 'DOP', 'Activa'
);

insert into public.fiscal_invoices (
  ncf, tipo_ncf, tipo_ingreso, fecha,
  cliente_rnc, cliente_tipo_id, cliente_nombre,
  monto_gravado_18, monto_gravado_16, monto_exento,
  itbis_facturado, total_facturado,
  monto_efectivo, monto_tarjeta, currency, status
) values (
  'E320000000002', 'E32', '01', '2026-05-08',
  null, 2, 'John Smith',
  120000.00, 0, 0,
  21600.00, 141600.00,
  50000.00, 91600.00, 'DOP', 'Activa'
);

insert into public.fiscal_invoices (
  ncf, tipo_ncf, tipo_ingreso, fecha,
  cliente_rnc, cliente_tipo_id, cliente_nombre,
  monto_gravado_18, monto_gravado_16, monto_exento,
  itbis_facturado, total_facturado,
  monto_cheque_transferencia, currency, status
) values (
  'E310000000002', 'E31', '01', '2026-05-10',
  '130567890', 1, 'Caribe Tours Vacation SRL',
  200000.00, 0, 0,
  36000.00, 236000.00,
  236000.00, 'DOP', 'Activa'
);

insert into public.fiscal_invoices (
  ncf, tipo_ncf, tipo_ingreso, fecha,
  cliente_rnc, cliente_tipo_id, cliente_nombre,
  monto_gravado_18, monto_gravado_16, monto_exento,
  itbis_facturado, total_facturado,
  monto_tarjeta, currency, status
) values (
  'E320000000003', 'E32', '01', '2026-05-12',
  '00114567890', 2, 'María García',
  35000.00, 0, 0,
  6300.00, 41300.00,
  41300.00, 'DOP', 'Activa'
);

insert into public.fiscal_invoices (
  ncf, ncf_modificado, tipo_ncf, tipo_ingreso, fecha,
  cliente_rnc, cliente_tipo_id, cliente_nombre,
  monto_gravado_18, monto_gravado_16, monto_exento,
  itbis_facturado, total_facturado,
  monto_cheque_transferencia, currency, status
) values (
  'E340000000001', 'E310000000001', 'E34', '01', '2026-05-14',
  '131098585', 1, 'Booking Holdings DR SRL',
  10000.00, 0, 0,
  1800.00, 11800.00,
  11800.00, 'DOP', 'Activa'
);

-- ── Sample Expenses (Gastos / 606) ──────────────────────────────────

insert into public.fiscal_expenses (
  ncf, tipo_gasto, fecha_comprobante, fecha_pago,
  proveedor_rnc, proveedor_tipo_id, proveedor_nombre,
  monto_facturado_servicios, monto_facturado_bienes, total_facturado,
  itbis_facturado, itbis_retenido, isr_retenido,
  forma_pago, currency, status
) values (
  'B0100004521', '02', '2026-05-02', '2026-05-02',
  '40298765432', 2, 'Rosa Martínez (Limpieza)',
  18000.00, 0, 18000.00,
  3240.00, 3240.00, 1800.00,
  '01', 'DOP', 'Pagado'
);

insert into public.fiscal_expenses (
  ncf, tipo_gasto, fecha_comprobante, fecha_pago,
  proveedor_rnc, proveedor_tipo_id, proveedor_nombre,
  monto_facturado_servicios, monto_facturado_bienes, total_facturado,
  itbis_facturado, forma_pago, currency, status
) values (
  'E310000045678', '08', '2026-05-04', '2026-05-05',
  '130789456', 1, 'Pool Masters SRL',
  12500.00, 5000.00, 17500.00,
  3150.00, '02', 'DOP', 'Pagado'
);

insert into public.fiscal_expenses (
  ncf, tipo_gasto, fecha_comprobante, fecha_pago,
  proveedor_rnc, proveedor_tipo_id, proveedor_nombre,
  monto_facturado_servicios, monto_facturado_bienes, total_facturado,
  itbis_facturado, forma_pago, currency, status
) values (
  'E310000123456', '02', '2026-05-01', '2026-05-15',
  '101012345', 1, 'Altice Dominicana SA',
  8500.00, 0, 8500.00,
  1530.00, '02', 'DOP', 'Pagado'
);

insert into public.fiscal_expenses (
  ncf, tipo_gasto, fecha_comprobante, fecha_pago,
  proveedor_rnc, proveedor_tipo_id, proveedor_nombre,
  monto_facturado_servicios, monto_facturado_bienes, total_facturado,
  itbis_facturado, forma_pago, currency, status
) values (
  'E310000098765', '02', '2026-05-05', '2026-05-10',
  '101500123', 1, 'CEPM (Consorcio Energético)',
  22000.00, 0, 22000.00,
  3960.00, '02', 'DOP', 'Pagado'
);

insert into public.fiscal_expenses (
  ncf, tipo_gasto, fecha_comprobante, fecha_pago,
  proveedor_rnc, proveedor_tipo_id, proveedor_nombre,
  monto_facturado_servicios, monto_facturado_bienes, total_facturado,
  itbis_facturado, itbis_retenido, isr_retenido,
  tipo_retencion_isr, forma_pago, currency, status
) values (
  'B0100007890', '08', '2026-05-07', '2026-05-07',
  '40287654321', 2, 'Pedro Sánchez (Técnico AC)',
  15000.00, 8000.00, 23000.00,
  4140.00, 4140.00, 2300.00,
  '02', '01', 'DOP', 'Pagado'
);

insert into public.fiscal_expenses (
  ncf, tipo_gasto, fecha_comprobante,
  proveedor_rnc, proveedor_tipo_id, proveedor_nombre,
  monto_facturado_servicios, monto_facturado_bienes, total_facturado,
  itbis_facturado, forma_pago, currency, status
) values (
  'E310000055555', '02', '2026-05-09',
  '131234567', 1, 'Distribuidora El Hogar SRL',
  0, 9500.00, 9500.00,
  1710.00, '03', 'DOP', 'Registrado'
);

insert into public.fiscal_expenses (
  ncf, tipo_gasto, fecha_comprobante, fecha_pago,
  proveedor_rnc, proveedor_tipo_id, proveedor_nombre,
  monto_facturado_servicios, monto_facturado_bienes, total_facturado,
  itbis_facturado, forma_pago, currency, status
) values (
  'E310000033333', '07', '2026-05-01', '2026-05-01',
  '101678900', 1, 'Seguros Universal SA',
  45000.00, 0, 45000.00,
  0, '02', 'DOP', 'Pagado'
);

insert into public.fiscal_expenses (
  ncf, tipo_gasto, fecha_comprobante,
  proveedor_rnc, proveedor_tipo_id, proveedor_nombre,
  monto_facturado_servicios, monto_facturado_bienes, total_facturado,
  itbis_facturado, forma_pago, currency, status
) values (
  'E310000077777', '11', '2026-05-11',
  '130999888', 1, 'Digital Marketing Caribe SRL',
  25000.00, 0, 25000.00,
  4500.00, '02', 'DOP', 'Registrado'
);

-- ── Sample Retentions (IR-17) ───────────────────────────────────────

insert into public.fiscal_retentions (
  tipo, concepto, beneficiario_rnc, beneficiario_tipo_id, beneficiario_nombre,
  fecha, monto_base, tasa_retencion, monto_retenido,
  ncf_relacionado, periodo_mes, periodo_year, status
) values
  ('ISR', 'Servicios persona física', '40298765432', 2, 'Rosa Martínez',
   '2026-05-02', 18000.00, 10, 1800.00, 'B0100004521', 5, 2026, 'Pendiente'),
  ('ITBIS', 'Servicios persona física', '40298765432', 2, 'Rosa Martínez',
   '2026-05-02', 3240.00, 100, 3240.00, 'B0100004521', 5, 2026, 'Pendiente'),
  ('ISR', 'Honorarios profesionales', '40287654321', 2, 'Pedro Sánchez',
   '2026-05-07', 23000.00, 10, 2300.00, 'B0100007890', 5, 2026, 'Pendiente'),
  ('ITBIS', 'Servicios persona física', '40287654321', 2, 'Pedro Sánchez',
   '2026-05-07', 4140.00, 100, 4140.00, 'B0100007890', 5, 2026, 'Pendiente'),
  ('ITBIS', 'Servicios persona jurídica', '130999888', 1, 'Digital Marketing Caribe SRL',
   '2026-05-11', 4500.00, 30, 1350.00, 'E310000077777', 5, 2026, 'Pendiente');

-- ══════════════════════════════════════════════════════════════════
-- Accounting Module — Chart of Accounts, Journal Entries
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  tipo text not null,
  naturaleza text not null default 'Debito',
  nivel int not null default 1,
  cuenta_padre text,
  acepta_movimientos boolean not null default true,
  descripcion text,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  numero serial,
  fecha date not null default current_date,
  descripcion text not null,
  referencia text,
  tipo text not null default 'Manual',
  property_id uuid references public.properties(id),
  source_invoice_id uuid references public.fiscal_invoices(id) on delete set null,
  source_expense_id uuid references public.fiscal_expenses(id) on delete set null,
  source_retention_id uuid references public.fiscal_retentions(id) on delete set null,
  status text not null default 'Borrador',
  total_debito numeric(18,2) not null default 0,
  total_credito numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  cuenta_codigo text not null references public.chart_of_accounts(codigo),
  descripcion text,
  debito numeric(18,2) not null default 0,
  credito numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.chart_of_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_entry_lines enable row level security;

create policy "chart_of_accounts_admin" on public.chart_of_accounts for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "journal_entries_admin" on public.journal_entries for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "journal_entry_lines_admin" on public.journal_entry_lines for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create index if not exists idx_journal_entries_fecha on public.journal_entries(fecha);
create index if not exists idx_journal_entry_lines_entry on public.journal_entry_lines(entry_id);
create index if not exists idx_journal_entry_lines_cuenta on public.journal_entry_lines(cuenta_codigo);

-- ── Chart of Accounts seed ──────────────────────────────────────
INSERT INTO public.chart_of_accounts (codigo, nombre, tipo, naturaleza, nivel, cuenta_padre, acepta_movimientos) VALUES
('1', 'Activos', 'Activo', 'Debito', 1, null, false),
('1.1', 'Activos Corrientes', 'Activo', 'Debito', 2, '1', false),
('1.1.01', 'Efectivo y Equivalentes', 'Activo', 'Debito', 3, '1.1', false),
('1.1.01.01', 'Caja General', 'Activo', 'Debito', 4, '1.1.01', true),
('1.1.01.02', 'Bancos', 'Activo', 'Debito', 4, '1.1.01', true),
('1.1.02', 'Cuentas por Cobrar', 'Activo', 'Debito', 3, '1.1', false),
('1.1.02.01', 'Clientes', 'Activo', 'Debito', 4, '1.1.02', true),
('1.1.02.02', 'Anticipos a Proveedores', 'Activo', 'Debito', 4, '1.1.02', true),
('1.1.03', 'Impuestos por Cobrar', 'Activo', 'Debito', 3, '1.1', false),
('1.1.03.01', 'ITBIS Pagado (Credito Fiscal)', 'Activo', 'Debito', 4, '1.1.03', true),
('1.1.03.02', 'Adelanto ISR', 'Activo', 'Debito', 4, '1.1.03', true),
('1.1.04', 'Inventarios', 'Activo', 'Debito', 3, '1.1', false),
('1.1.04.01', 'Suministros de Limpieza', 'Activo', 'Debito', 4, '1.1.04', true),
('1.1.04.02', 'Amenidades y Consumibles', 'Activo', 'Debito', 4, '1.1.04', true),
('1.2', 'Activos No Corrientes', 'Activo', 'Debito', 2, '1', false),
('1.2.01', 'Propiedades de Inversion', 'Activo', 'Debito', 3, '1.2', true),
('1.2.02', 'Mobiliario y Equipos', 'Activo', 'Debito', 3, '1.2', true),
('1.2.03', 'Depreciacion Acumulada', 'Activo', 'Credito', 3, '1.2', true),
('2', 'Pasivos', 'Pasivo', 'Credito', 1, null, false),
('2.1', 'Pasivos Corrientes', 'Pasivo', 'Credito', 2, '2', false),
('2.1.01', 'Cuentas por Pagar', 'Pasivo', 'Credito', 3, '2.1', false),
('2.1.01.01', 'Proveedores', 'Pasivo', 'Credito', 4, '2.1.01', true),
('2.1.01.02', 'Gastos Acumulados por Pagar', 'Pasivo', 'Credito', 4, '2.1.01', true),
('2.1.02', 'Impuestos por Pagar', 'Pasivo', 'Credito', 3, '2.1', false),
('2.1.02.01', 'ITBIS por Pagar', 'Pasivo', 'Credito', 4, '2.1.02', true),
('2.1.02.02', 'ISR Retenido por Pagar', 'Pasivo', 'Credito', 4, '2.1.02', true),
('2.1.02.03', 'ITBIS Retenido por Pagar', 'Pasivo', 'Credito', 4, '2.1.02', true),
('2.1.03', 'Depositos de Huespedes', 'Pasivo', 'Credito', 3, '2.1', true),
('2.1.04', 'Ingresos Diferidos', 'Pasivo', 'Credito', 3, '2.1', true),
('2.2', 'Pasivos No Corrientes', 'Pasivo', 'Credito', 2, '2', false),
('2.2.01', 'Prestamos por Pagar', 'Pasivo', 'Credito', 3, '2.2', true),
('3', 'Capital', 'Capital', 'Credito', 1, null, false),
('3.1', 'Capital Social', 'Capital', 'Credito', 2, '3', true),
('3.2', 'Reservas', 'Capital', 'Credito', 2, '3', true),
('3.3', 'Utilidades Retenidas', 'Capital', 'Credito', 2, '3', true),
('3.4', 'Resultado del Ejercicio', 'Capital', 'Credito', 2, '3', true),
('4', 'Ingresos', 'Ingreso', 'Credito', 1, null, false),
('4.1', 'Ingresos Operacionales', 'Ingreso', 'Credito', 2, '4', false),
('4.1.01', 'Alquiler Vacacional', 'Ingreso', 'Credito', 3, '4.1', true),
('4.1.02', 'Comisiones por Gestion', 'Ingreso', 'Credito', 3, '4.1', true),
('4.1.03', 'Servicios Adicionales', 'Ingreso', 'Credito', 3, '4.1', true),
('4.2', 'Otros Ingresos', 'Ingreso', 'Credito', 2, '4', false),
('4.2.01', 'Ingresos Financieros', 'Ingreso', 'Credito', 3, '4.2', true),
('4.2.02', 'Ingresos Extraordinarios', 'Ingreso', 'Credito', 3, '4.2', true),
('5', 'Costos de Operacion', 'Costo', 'Debito', 1, null, false),
('5.1', 'Costos Directos', 'Costo', 'Debito', 2, '5', false),
('5.1.01', 'Limpieza y Lavanderia', 'Costo', 'Debito', 3, '5.1', true),
('5.1.02', 'Mantenimiento Propiedades', 'Costo', 'Debito', 3, '5.1', true),
('5.1.03', 'Servicios Publicos (Energia)', 'Costo', 'Debito', 3, '5.1', true),
('5.1.04', 'Servicios Publicos (Agua/Internet/TV)', 'Costo', 'Debito', 3, '5.1', true),
('5.1.05', 'Suministros Operativos', 'Costo', 'Debito', 3, '5.1', true),
('5.1.06', 'Piscina y Areas Comunes', 'Costo', 'Debito', 3, '5.1', true),
('6', 'Gastos Operativos', 'Gasto', 'Debito', 1, null, false),
('6.1', 'Gastos de Administracion', 'Gasto', 'Debito', 2, '6', false),
('6.1.01', 'Seguros', 'Gasto', 'Debito', 3, '6.1', true),
('6.1.02', 'Gastos Legales y Profesionales', 'Gasto', 'Debito', 3, '6.1', true),
('6.1.03', 'Depreciacion', 'Gasto', 'Debito', 3, '6.1', true),
('6.1.04', 'Gastos Bancarios', 'Gasto', 'Debito', 3, '6.1', true),
('6.2', 'Gastos de Ventas', 'Gasto', 'Debito', 2, '6', false),
('6.2.01', 'Publicidad y Marketing', 'Gasto', 'Debito', 3, '6.2', true),
('6.2.02', 'Comisiones Plataformas (Booking/Airbnb)', 'Gasto', 'Debito', 3, '6.2', true),
('6.2.03', 'Gastos de Representacion', 'Gasto', 'Debito', 3, '6.2', true);
