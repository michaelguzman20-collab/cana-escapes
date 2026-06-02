-- ══════════════════════════════════════════════════════════════════
-- Owner Payments — Monthly payout tracking
-- Stores actual payments sent to owners. The full statement is
-- computed on-the-fly from reservations + charges; this table only
-- records the payment side.
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.owner_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  period_month    int  NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year     int  NOT NULL CHECK (period_year BETWEEN 2020 AND 2100),
  amount_paid_usd numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid_rd  numeric(14,2) NOT NULL DEFAULT 0,
  payment_date    date NOT NULL,
  payment_method  text NOT NULL DEFAULT 'Transferencia',
  reference       text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_payments_owner
  ON public.owner_payments(owner_id);

CREATE INDEX IF NOT EXISTS idx_owner_payments_period
  ON public.owner_payments(period_year, period_month);

-- Enable RLS
ALTER TABLE public.owner_payments ENABLE ROW LEVEL SECURITY;

-- Admin policies (matches pattern from other tables)
DROP POLICY IF EXISTS "Admins manage owner_payments" ON public.owner_payments;
CREATE POLICY "Admins manage owner_payments"
  ON public.owner_payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.owner_payments IS
  'Tracks actual payouts sent to owners. The full statement (income, charges, net) is computed on-the-fly.';
