-- ================================================================
-- Migration: 004 — Geofences + Driver Push Tokens
-- Purpose  : Admin-configurable terminal geofences for automated
--            shift-end prompts (Feature #7).
--            expo_push_token stored per driver for server-to-device
--            push notification delivery.
-- ================================================================

-- ── geofences ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.geofences (
  id            UUID             NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT             NOT NULL UNIQUE,         -- e.g. "Manaoag Public Terminal"
  route_id      UUID             REFERENCES public.routes(id) ON DELETE SET NULL,
  center_lat    DOUBLE PRECISION NOT NULL,
  center_lng    DOUBLE PRECISION NOT NULL,
  radius_m      INTEGER          NOT NULL DEFAULT 200,    -- geofence radius in metres
  is_terminal   BOOLEAN          NOT NULL DEFAULT TRUE,   -- terminal = triggers shift-end prompt
  is_active     BOOLEAN          NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofences_route   ON public.geofences (route_id, is_active);
CREATE INDEX IF NOT EXISTS idx_geofences_active  ON public.geofences (is_active);

CREATE TRIGGER trg_geofences_updated_at
  BEFORE UPDATE ON public.geofences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Authenticated drivers can read active geofences (needed for client-side awareness)
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_geofences"
  ON public.geofences FOR SELECT
  USING (is_active = TRUE AND auth.role() = 'authenticated');

-- ── driver push tokens ─────────────────────────────────────────────────────────
-- Expo Push Token per driver, upserted on each app launch.
-- Used by geofence-check Edge Function to push the shift-end prompt.

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- ── Seed: Mapandan corridor terminal geofences ───────────────────────────────
INSERT INTO public.geofences (name, route_id, center_lat, center_lng, radius_m, is_terminal)
VALUES
  ('Mapandan Public Terminal', NULL, 16.0247, 120.4549, 200, TRUE),
  ('Mangaldan Public Market', NULL, 16.0702, 120.4019, 200, TRUE),
  ('Dagupan City Bus Terminal', NULL, 16.0912, 120.5948, 200, TRUE),
  ('Manaoag Public Terminal', NULL, 16.0434, 120.4866, 200, TRUE)
  ON CONFLICT (name) DO UPDATE
    SET route_id = NULL,
        center_lat = EXCLUDED.center_lat,
        center_lng = EXCLUDED.center_lng,
        radius_m = EXCLUDED.radius_m,
        is_terminal = EXCLUDED.is_terminal,
        is_active = TRUE;

-- ── geofence_alerts ───────────────────────────────────────────────────────────
-- Records each push notification sent by geofence-check.
-- Used for deduplication: at most one prompt per terminal per 10-minute window.

CREATE TABLE IF NOT EXISTS public.geofence_alerts (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id       UUID        NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  driver_id     UUID        NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  geofence_id   UUID        NOT NULL REFERENCES public.geofences(id) ON DELETE CASCADE,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofence_alerts_trip_gf
  ON public.geofence_alerts (trip_id, geofence_id, sent_at DESC);

ALTER TABLE public.geofence_alerts ENABLE ROW LEVEL SECURITY;
-- Service-role only — no client access needed
