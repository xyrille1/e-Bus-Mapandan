-- ================================================================
-- Migration: 003 — Routes, Route Stations, Vehicle-Route Assignments
-- Purpose  : Admin-provisioned route definitions.  Drivers have
--            read-only access; all create/edit/delete is admin-only.
-- ================================================================

-- ── routes ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.routes (
  id           UUID  NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT  NOT NULL UNIQUE,           -- e.g. "Manaoag to Dagupan"
  short_code   TEXT,                            -- e.g. "MAN-DAG"
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routes_active ON public.routes (is_active);

CREATE TRIGGER trg_routes_updated_at
  BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Authenticated drivers can read active routes
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_routes"
  ON public.routes FOR SELECT
  USING (is_active = TRUE AND auth.role() = 'authenticated');

-- ── route_stations ────────────────────────────────────────────────────────────
-- Ordered list of stops on a route.  Used by the ETA engine to identify
-- downstream stations and calculate arrival estimates.

CREATE TABLE IF NOT EXISTS public.route_stations (
  id             UUID             NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id       UUID             NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  station_name   TEXT             NOT NULL,
  sequence_order INTEGER          NOT NULL,          -- 1-based stop number
  lat            DOUBLE PRECISION NOT NULL,
  lng            DOUBLE PRECISION NOT NULL,
  is_terminal    BOOLEAN          NOT NULL DEFAULT FALSE,  -- start/end terminal flag
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_stations_route  ON public.route_stations (route_id, sequence_order);

ALTER TABLE public.route_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_route_stations"
  ON public.route_stations FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── vehicle_routes ────────────────────────────────────────────────────────────
-- Which routes are assigned to which driver/vehicle.
-- Admin assigns routes; driver reads what is assigned to their vehicle_id.

CREATE TABLE IF NOT EXISTS public.vehicle_routes (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id  TEXT NOT NULL,         -- matches drivers.vehicle_id
  route_id    UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vehicle_id, route_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_routes_vehicle ON public.vehicle_routes (vehicle_id, is_active);

ALTER TABLE public.vehicle_routes ENABLE ROW LEVEL SECURITY;

-- Driver can only see routes assigned to their own vehicle_id
CREATE POLICY "drivers_read_own_vehicle_routes"
  ON public.vehicle_routes FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND auth.jwt() ->> 'driver_role' = 'driver'
    AND vehicle_id = auth.jwt() ->> 'vehicle_id'
  );

-- ── FK back-reference: trips.route_id ────────────────────────────────────────
-- Add the FK constraint deferred from migration 002 now that routes table exists.
ALTER TABLE public.trips
  ADD CONSTRAINT fk_trips_route_id
  FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE SET NULL;

-- ── Seed: Mapandan corridor routes (both directions) ─────────────────────────
DO $$
DECLARE
  v_map_mang UUID;
  v_mang_map UUID;
  v_map_dag UUID;
  v_dag_map UUID;
  v_map_man UUID;
  v_man_map UUID;
BEGIN
  INSERT INTO public.routes (name, short_code)
  VALUES
    ('Mapandan to Mangaldan', 'MAP-MANGLD'),
    ('Mangaldan to Mapandan', 'MANGLD-MAP'),
    ('Mapandan to Dagupan', 'MAP-DAG'),
    ('Dagupan to Mapandan', 'DAG-MAP'),
    ('Mapandan to Manaoag', 'MAP-MAN'),
    ('Manaoag to Mapandan', 'MAN-MAP')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_map_mang FROM public.routes WHERE name = 'Mapandan to Mangaldan';
  SELECT id INTO v_mang_map FROM public.routes WHERE name = 'Mangaldan to Mapandan';
  SELECT id INTO v_map_dag FROM public.routes WHERE name = 'Mapandan to Dagupan';
  SELECT id INTO v_dag_map FROM public.routes WHERE name = 'Dagupan to Mapandan';
  SELECT id INTO v_map_man FROM public.routes WHERE name = 'Mapandan to Manaoag';
  SELECT id INTO v_man_map FROM public.routes WHERE name = 'Manaoag to Mapandan';

  INSERT INTO public.route_stations
    (route_id, station_name, sequence_order, lat, lng, is_terminal)
  VALUES
    -- Mapandan -> Mangaldan
    (v_map_mang, 'Mapandan Public Terminal', 1, 16.0247, 120.4549, TRUE),
    (v_map_mang, 'Tulugan Junction', 2, 16.0312, 120.4688, FALSE),
    (v_map_mang, 'Mangaldan Public Market', 3, 16.0702, 120.4019, TRUE),

    -- Mangaldan -> Mapandan
    (v_mang_map, 'Mangaldan Public Market', 1, 16.0702, 120.4019, TRUE),
    (v_mang_map, 'Tulugan Junction', 2, 16.0312, 120.4688, FALSE),
    (v_mang_map, 'Mapandan Public Terminal', 3, 16.0247, 120.4549, TRUE),

    -- Mapandan -> Dagupan
    (v_map_dag, 'Mapandan Public Terminal', 1, 16.0247, 120.4549, TRUE),
    (v_map_dag, 'Calasiao Bus Stop', 2, 16.0788, 120.5609, FALSE),
    (v_map_dag, 'Dagupan City Bus Terminal', 3, 16.0912, 120.5948, TRUE),

    -- Dagupan -> Mapandan
    (v_dag_map, 'Dagupan City Bus Terminal', 1, 16.0912, 120.5948, TRUE),
    (v_dag_map, 'Calasiao Bus Stop', 2, 16.0788, 120.5609, FALSE),
    (v_dag_map, 'Mapandan Public Terminal', 3, 16.0247, 120.4549, TRUE),

    -- Mapandan -> Manaoag
    (v_map_man, 'Mapandan Public Terminal', 1, 16.0247, 120.4549, TRUE),
    (v_map_man, 'Urdaneta Junction', 2, 16.0571, 120.5140, FALSE),
    (v_map_man, 'Binalonan Stop', 3, 16.0498, 120.5012, FALSE),
    (v_map_man, 'Manaoag Public Terminal', 4, 16.0434, 120.4866, TRUE),

    -- Manaoag -> Mapandan
    (v_man_map, 'Manaoag Public Terminal', 1, 16.0434, 120.4866, TRUE),
    (v_man_map, 'Binalonan Stop', 2, 16.0498, 120.5012, FALSE),
    (v_man_map, 'Urdaneta Junction', 3, 16.0571, 120.5140, FALSE),
    (v_man_map, 'Mapandan Public Terminal', 4, 16.0247, 120.4549, TRUE)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.vehicle_routes (vehicle_id, route_id, is_active)
  SELECT 'DRV-4821', r.id, TRUE
  FROM public.routes r
  WHERE r.name IN (
    'Mapandan to Mangaldan',
    'Mangaldan to Mapandan',
    'Mapandan to Dagupan',
    'Dagupan to Mapandan',
    'Mapandan to Manaoag',
    'Manaoag to Mapandan'
  )
  ON CONFLICT (vehicle_id, route_id) DO UPDATE
    SET is_active = EXCLUDED.is_active;

  INSERT INTO public.vehicle_routes (vehicle_id, route_id, is_active)
  SELECT 'DRV-2198', r.id, TRUE
  FROM public.routes r
  WHERE r.name IN (
    'Mapandan to Mangaldan',
    'Mangaldan to Mapandan',
    'Mapandan to Dagupan',
    'Dagupan to Mapandan',
    'Mapandan to Manaoag',
    'Manaoag to Mapandan'
  )
  ON CONFLICT (vehicle_id, route_id) DO UPDATE
    SET is_active = EXCLUDED.is_active;
END;
$$;
