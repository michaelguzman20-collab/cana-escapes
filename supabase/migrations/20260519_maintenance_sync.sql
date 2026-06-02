-- ══════════════════════════════════════════════════════════════════
-- Maintenance ↔ Charges integration
-- Adds cost assignment + charge sync tracking to maintenance_tickets
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS asignacion_costo text NOT NULL DEFAULT 'propietario',
  ADD COLUMN IF NOT EXISTS charge_id uuid REFERENCES public.charges(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

COMMENT ON COLUMN public.maintenance_tickets.asignacion_costo
  IS 'propietario = cargo al propietario, cana_escapes = gasto CE, incluido = sin cargo (mantenimiento mínimo)';

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_charge
  ON public.maintenance_tickets(charge_id) WHERE charge_id IS NOT NULL;
