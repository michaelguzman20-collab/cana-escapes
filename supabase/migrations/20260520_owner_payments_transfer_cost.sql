-- ══════════════════════════════════════════════════════════════════
-- Owner Payments — Add transfer cost
-- The owner assumes the cost of the bank transfer. This field
-- records how much was deducted from the owner's net to cover the
-- transfer fee.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.owner_payments
  ADD COLUMN IF NOT EXISTS transfer_cost_usd numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfer_cost_rd numeric(14,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.owner_payments.transfer_cost_usd IS
  'Transfer/wire fee absorbed by the owner (deducted from net), USD';
COMMENT ON COLUMN public.owner_payments.transfer_cost_rd IS
  'Transfer/wire fee absorbed by the owner (deducted from net), RD$';
