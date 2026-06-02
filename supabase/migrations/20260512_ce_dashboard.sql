-- ══════════════════════════════════════════════════════════════════
-- CE Dashboard: charge_type on charges + ce_settings table
-- ══════════════════════════════════════════════════════════════════

-- Add charge_type to distinguish owner charges vs CE expenses
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS charge_type text NOT NULL DEFAULT 'propietario';

-- Allow property_id to be null for empresa-level charges
ALTER TABLE public.charges ALTER COLUMN property_id DROP NOT NULL;

-- CE Settings (stays.net config, etc.)
CREATE TABLE IF NOT EXISTS public.ce_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ce_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to ce_settings"
  ON public.ce_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed default stays.net settings
INSERT INTO public.ce_settings (key, value) VALUES
  ('staysnet_active', 'false'),
  ('staysnet_fixed_usd', '50'),
  ('staysnet_pct', '1.8')
ON CONFLICT (key) DO NOTHING;
