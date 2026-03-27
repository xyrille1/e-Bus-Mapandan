-- ================================================================
-- Migration: 001 — Drivers Table
-- Purpose  : Stores driver credentials (Vehicle ID + bcrypt PIN hash)
--            All direct client access is blocked; auth goes through
--            the driver-login Edge Function with service-role key.
-- ================================================================

-- Shared trigger function to auto-update updated_at on any table
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.drivers (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id      TEXT        NOT NULL UNIQUE,   -- e.g. "DRV-4821"
  pin_hash        TEXT        NOT NULL,           -- bcrypt hash, min 6-digit PIN
  full_name       TEXT,
  failed_attempts INTEGER     NOT NULL DEFAULT 0,
  locked_at       TIMESTAMPTZ,                    -- NULL = unlocked; set at attempt #5
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup by Vehicle ID on every login attempt
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_id ON public.drivers (vehicle_id);

-- Auto-stamp updated_at on every row update
CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Zero client-side access — deny-all RLS; service_role key bypasses this
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
-- (intentionally no policies — only Edge Functions with service_role can read)

-- ----------------------------------------------------------------
-- Seed: two demo drivers for dev / QA testing
-- Hashes below are bcrypt rounds=10 of '482193' and '219845' respectively.
-- Generate real hashes server-side; never store PINs in plaintext.
-- ----------------------------------------------------------------
INSERT INTO public.drivers (vehicle_id, pin_hash, full_name)
VALUES
  ('DRV-4821', '$2b$10$L2GFuSSlrHvtSeU1hqYtl.0jMjViJTQGd1E.A.7lSmi1og8Qr8CFy', 'Juan dela Cruz'),
  ('DRV-2198', '$2b$10$WTLgdlybrIkqR0hyBdO9A.RV67gRpouhq5fFJU.1KQWMtjAIXXLdW', 'Maria Santos')
ON CONFLICT (vehicle_id) DO NOTHING;
