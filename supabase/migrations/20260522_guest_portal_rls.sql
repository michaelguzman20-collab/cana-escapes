-- ══════════════════════════════════════════════════════════════════
-- Guest Portal RLS — Read-only access for property owners (guests)
-- Pattern: guest can SELECT rows linked to properties they own
-- via properties.owner_profile_id = auth.uid()
-- ══════════════════════════════════════════════════════════════════

-- ── maintenance_tickets: guest can see tickets on their property ──
CREATE POLICY "guest_read_maintenance_tickets"
  ON public.maintenance_tickets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = maintenance_tickets.property_id
        AND properties.owner_profile_id = auth.uid()
    )
  );

-- ── maintenance_schedules: guest can see schedules on their property ──
CREATE POLICY "guest_read_maintenance_schedules"
  ON public.maintenance_schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = maintenance_schedules.property_id
        AND properties.owner_profile_id = auth.uid()
    )
  );

-- ── charges: guest can see charges linked to their property ──
CREATE POLICY "guest_read_charges"
  ON public.charges
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = charges.property_id
        AND properties.owner_profile_id = auth.uid()
    )
  );

-- ── charge_items: guest can see items from charges they can see ──
CREATE POLICY "guest_read_charge_items"
  ON public.charge_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.charges
      JOIN public.properties ON properties.id = charges.property_id
      WHERE charges.id = charge_items.charge_id
        AND properties.owner_profile_id = auth.uid()
    )
  );

-- ── owners: guest can see their own owner record ──
CREATE POLICY "guest_read_own_owner"
  ON public.owners
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
  );

-- ── owner_payments: guest can see payments for their owner record ──
CREATE POLICY "guest_read_owner_payments"
  ON public.owner_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.owners
      WHERE owners.id = owner_payments.owner_id
        AND owners.profile_id = auth.uid()
    )
  );
