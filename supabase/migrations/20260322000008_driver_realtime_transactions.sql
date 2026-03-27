-- ============================================================================
-- Migration: 008 — Driver realtime transactions
-- Purpose : Ensure driver mode writes real transactional data and uses
--           atomic trip finalization for production consistency.
--
-- Changes:
--   1) Add driver_incidents table for real incident submissions.
--   2) Add finalize_trip_transaction(...) RPC for atomic trip completion.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.driver_incidents (
  id            UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id       UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  driver_id     UUID         NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  vehicle_id    TEXT         NOT NULL,
  route_id      UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  incident_type TEXT         NOT NULL
                CHECK (incident_type IN ('Traffic', 'Breakdown', 'Medical', 'Security')),
  note          TEXT         NOT NULL CHECK (char_length(trim(note)) >= 8),
  reported_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_incidents_driver_time
  ON public.driver_incidents (driver_id, reported_at DESC);

CREATE INDEX IF NOT EXISTS idx_driver_incidents_trip
  ON public.driver_incidents (trip_id);

ALTER TABLE public.driver_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_insert_own_incidents" ON public.driver_incidents;
CREATE POLICY "drivers_insert_own_incidents"
  ON public.driver_incidents
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'driver_role' = 'driver'
    AND auth.uid() = driver_id
  );

DROP POLICY IF EXISTS "drivers_select_own_incidents" ON public.driver_incidents;
CREATE POLICY "drivers_select_own_incidents"
  ON public.driver_incidents
  FOR SELECT
  USING (
    auth.jwt() ->> 'driver_role' = 'driver'
    AND auth.uid() = driver_id
  );

CREATE OR REPLACE FUNCTION public.finalize_trip_transaction(
  p_trip_id UUID,
  p_vehicle_id TEXT,
  p_ended_at TIMESTAMPTZ,
  p_distance_km DOUBLE PRECISION
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_trip_rows INTEGER;
BEGIN
  UPDATE public.trips
  SET status = 'completed',
      ended_at = p_ended_at,
      distance_km = p_distance_km,
      updated_at = NOW()
  WHERE id = p_trip_id
    AND auth.uid() = driver_id
    AND auth.jwt() ->> 'driver_role' = 'driver';

  GET DIAGNOSTICS v_trip_rows = ROW_COUNT;

  IF v_trip_rows = 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.bus_positions
  SET status = 'idle',
      speed_kph = 0,
      updated_at = p_ended_at,
      trip_id = NULL
  WHERE id = p_vehicle_id
    AND (trip_id = p_trip_id OR trip_id IS NULL);

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_trip_transaction(UUID, TEXT, TIMESTAMPTZ, DOUBLE PRECISION)
TO authenticated;
