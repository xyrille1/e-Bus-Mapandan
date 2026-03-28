-- ================================================================
-- Migration: 002 — Trips and GPS Pings tables
-- Purpose  : Core telemetry storage for the GPS broadcast feature.
--            gps_pings is the hot table written every 5–10 s per bus.
--            trips is the shift-level record that groups pings.
-- ================================================================

-- ── trips ──────────────────────────────────────────────────────────────────────
-- One row per shift.  Created when driver taps Start Shift; finalised
-- when driver submits End Shift (status = completed).

CREATE TABLE IF NOT EXISTS public.trips (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id     UUID        NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  vehicle_id    TEXT        NOT NULL,       -- denormalised for fast query without join
  route_id      UUID,                       -- FK added in migration 003 once routes table exists
  status        TEXT        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  distance_km   DOUBLE PRECISION,           -- computed on finalisation
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_driver_id   ON public.trips (driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id  ON public.trips (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_status      ON public.trips (status);

CREATE TRIGGER trg_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: drivers can only read/write their own trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drivers_own_trips_select"
  ON public.trips FOR SELECT
  USING (auth.uid() = driver_id AND auth.jwt() ->> 'driver_role' = 'driver');

CREATE POLICY "drivers_own_trips_insert"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = driver_id AND auth.jwt() ->> 'driver_role' = 'driver');

CREATE POLICY "drivers_own_trips_update"
  ON public.trips FOR UPDATE
  USING (auth.uid() = driver_id AND auth.jwt() ->> 'driver_role' = 'driver');

-- ── gps_pings ─────────────────────────────────────────────────────────────────
-- Hot append-only table.  One row per GPS reading (~5–10 s interval).
-- is_synced = false  →  written by offline cache upload; deduplicated by
-- unique constraint on (trip_id, timestamp).

CREATE TABLE IF NOT EXISTS public.gps_pings (
  id            UUID            NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id       UUID            NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  driver_id     UUID            NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  speed_kph     DOUBLE PRECISION NOT NULL DEFAULT 0,
  heading       DOUBLE PRECISION,           -- degrees 0–360, nullable if unavailable
  accuracy_m    DOUBLE PRECISION,           -- GPS accuracy in metres
  is_synced     BOOLEAN         NOT NULL DEFAULT TRUE,  -- false = came from offline cache
  "timestamp"   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Deduplication guard: same trip cannot have two pings at the exact same moment
CREATE UNIQUE INDEX IF NOT EXISTS idx_gps_pings_trip_ts
  ON public.gps_pings (trip_id, "timestamp");

CREATE INDEX IF NOT EXISTS idx_gps_pings_trip_id     ON public.gps_pings (trip_id);
CREATE INDEX IF NOT EXISTS idx_gps_pings_driver_id   ON public.gps_pings (driver_id);
CREATE INDEX IF NOT EXISTS idx_gps_pings_timestamp   ON public.gps_pings ("timestamp" DESC);

-- Realtime must be enabled on this table in the Supabase dashboard
ALTER TABLE public.gps_pings REPLICA IDENTITY FULL;

-- RLS: drivers can insert their own pings; admins/commuters read via separate roles
ALTER TABLE public.gps_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drivers_insert_own_pings"
  ON public.gps_pings FOR INSERT
  WITH CHECK (auth.uid() = driver_id AND auth.jwt() ->> 'driver_role' = 'driver');

CREATE POLICY "drivers_select_own_pings"
  ON public.gps_pings FOR SELECT
  USING (auth.uid() = driver_id AND auth.jwt() ->> 'driver_role' = 'driver');

DROP POLICY IF EXISTS "public_read_active_trip_pings" ON public.gps_pings;
CREATE POLICY "public_read_active_trip_pings"
  ON public.gps_pings FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = gps_pings.trip_id
        AND t.status = 'active'
    )
  );

-- ── Database webhook for ETA recalculation ───────────────────────────────────
-- After each INSERT into gps_pings, trigger the recalculate-eta Edge Function.
-- This is configured in the Supabase dashboard:
--   Table: gps_pings  |  Event: INSERT  |  Function: recalculate-eta
-- (SQL webhook definitions are dashboard-only in hosted Supabase; documented here
--  for reference only.)
