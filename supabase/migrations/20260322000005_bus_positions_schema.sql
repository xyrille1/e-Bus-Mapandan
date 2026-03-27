-- ============================================================================
-- Migration: 005 — bus_positions live tracking table
--
-- Purpose : Real-time view layer between the GPS ping stream (driver) and
--           every commuter app. The recalculate-eta Edge Function upserts
--           one row per active vehicle on every GPS ping INSERT.
--           The commuter LiveTrackingMapScreen subscribes to this table
--           via Supabase Realtime channel "bus-positions-live".
--
-- Schema matches the upsert payload in supabase/functions/recalculate-eta.
-- Schema matches the subscription in src/shared/supabase/busPositions.ts.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bus_positions (
  -- vehicle_id (e.g. "BUS-102") is the PK so each upsert replaces the single
  -- live-position record for that vehicle instead of accumulating rows.
  id           TEXT             PRIMARY KEY,
  plate_number TEXT             NOT NULL,
  latitude     DOUBLE PRECISION NOT NULL,
  longitude    DOUBLE PRECISION NOT NULL,
  speed_kph    DOUBLE PRECISION NOT NULL DEFAULT 0,
  -- 'active' while shift is running, 'idle' after shift ends
  status       TEXT             NOT NULL DEFAULT 'active',
  trip_id      UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  route_id     UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  route_name   TEXT,
  -- JSON array: [{station_id, station_name, eta_mins}] written by recalculate-eta
  eta_json     TEXT,
  updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bus_positions
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL;

ALTER TABLE public.bus_positions
  ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL;

ALTER TABLE public.bus_positions
  ADD COLUMN IF NOT EXISTS route_name TEXT;

CREATE INDEX IF NOT EXISTS idx_bus_positions_route_id ON public.bus_positions(route_id);
CREATE INDEX IF NOT EXISTS idx_bus_positions_trip_id ON public.bus_positions(trip_id);

COMMENT ON TABLE public.bus_positions IS
  'One live row per active vehicle. Upserted on every GPS ping by recalculate-eta Edge Function. Read by commuter Realtime subscription.';

-- Realtime requires REPLICA IDENTITY FULL so the full row (not just PK)
-- is broadcast in the change payload to subscribed commuter clients.
ALTER TABLE public.bus_positions REPLICA IDENTITY FULL;

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.bus_positions ENABLE ROW LEVEL SECURITY;

-- Commuters (anon role) and authenticated users can SELECT all live positions.
-- This is public read — live bus locations are not sensitive.
CREATE POLICY "bus_positions_read_public"
  ON public.bus_positions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "drivers_update_own_bus_position" ON public.bus_positions;
CREATE POLICY "drivers_update_own_bus_position"
  ON public.bus_positions
  FOR UPDATE
  USING (
    auth.jwt() ->> 'driver_role' = 'driver'
    AND id = auth.jwt() ->> 'vehicle_id'
  )
  WITH CHECK (
    auth.jwt() ->> 'driver_role' = 'driver'
    AND id = auth.jwt() ->> 'vehicle_id'
  );

-- No INSERT / UPDATE / DELETE policy for anon or authenticated.
-- Only the service_role (recalculate-eta Edge Function using
-- SUPABASE_SERVICE_ROLE_KEY) can write to this table.
