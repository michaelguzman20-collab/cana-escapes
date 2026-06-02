-- Add marketing_pct column to platform_configs
ALTER TABLE public.platform_configs
  ADD COLUMN IF NOT EXISTS marketing_pct numeric(5,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.platform_configs.marketing_pct IS 'Additional marketing/promo percentage added on top of commission_pct';
