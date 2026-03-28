-- ============================================================================
-- Migration: 007 — Connected features hotfix
-- Purpose : Apply production-safe fixes for already-deployed environments
--           without requiring a full DB reset.
--
-- Fixes:
--   1) Correct demo driver bcrypt hashes used by driver-login.
--   2) Seed Mapandan corridor routes in both directions.
--   3) Refresh route stations for the seeded routes.
--   4) Ensure demo vehicle-route assignments exist and are active.
--   5) Ensure terminal geofences are active and globally applicable.
-- ============================================================================

DO $$
DECLARE
  v_map_mang UUID;
  v_mang_map UUID;
  v_map_dag UUID;
  v_dag_map UUID;
  v_map_man UUID;
  v_man_map UUID;
BEGIN
  -- 1) Fix demo driver hashes (bcrypt rounds=10).
  UPDATE public.drivers
  SET pin_hash = '$2b$10$L2GFuSSlrHvtSeU1hqYtl.0jMjViJTQGd1E.A.7lSmi1og8Qr8CFy',
      updated_at = NOW()
  WHERE vehicle_id = 'DRV-4821';

  UPDATE public.drivers
  SET pin_hash = '$2b$10$WTLgdlybrIkqR0hyBdO9A.RV67gRpouhq5fFJU.1KQWMtjAIXXLdW',
      updated_at = NOW()
  WHERE vehicle_id = 'DRV-2198';

  -- 2) Ensure requested routes exist and are active.
  INSERT INTO public.routes (name, short_code, is_active)
  VALUES
    ('Mapandan to Mangaldan', 'MAP-MANGLD', TRUE),
    ('Mangaldan to Mapandan', 'MANGLD-MAP', TRUE),
    ('Mapandan to Dagupan', 'MAP-DAG', TRUE),
    ('Dagupan to Mapandan', 'DAG-MAP', TRUE),
    ('Mapandan to Manaoag', 'MAP-MAN', TRUE),
    ('Manaoag to Mapandan', 'MAN-MAP', TRUE)
  ON CONFLICT (name) DO UPDATE
    SET short_code = EXCLUDED.short_code,
        is_active = TRUE,
        updated_at = NOW();

  UPDATE public.routes
  SET is_active = FALSE,
      updated_at = NOW()
  WHERE name NOT IN (
    'Mapandan to Mangaldan',
    'Mangaldan to Mapandan',
    'Mapandan to Dagupan',
    'Dagupan to Mapandan',
    'Mapandan to Manaoag',
    'Manaoag to Mapandan'
  )
  AND is_active = TRUE;

  SELECT id INTO v_map_mang FROM public.routes WHERE name = 'Mapandan to Mangaldan' LIMIT 1;
  SELECT id INTO v_mang_map FROM public.routes WHERE name = 'Mangaldan to Mapandan' LIMIT 1;
  SELECT id INTO v_map_dag FROM public.routes WHERE name = 'Mapandan to Dagupan' LIMIT 1;
  SELECT id INTO v_dag_map FROM public.routes WHERE name = 'Dagupan to Mapandan' LIMIT 1;
  SELECT id INTO v_map_man FROM public.routes WHERE name = 'Mapandan to Manaoag' LIMIT 1;
  SELECT id INTO v_man_map FROM public.routes WHERE name = 'Manaoag to Mapandan' LIMIT 1;

  -- 3) Refresh station sequence for each seeded route.
  DELETE FROM public.route_stations
  WHERE route_id IN (v_map_mang, v_mang_map, v_map_dag, v_dag_map, v_map_man, v_man_map);

  INSERT INTO public.route_stations (route_id, station_name, sequence_order, lat, lng, is_terminal)
  VALUES
    (v_map_mang, 'Mapandan Public Terminal', 1, 16.0247, 120.4549, TRUE),
    (v_map_mang, 'Tulugan Junction', 2, 16.0312, 120.4688, FALSE),
    (v_map_mang, 'Mangaldan Public Market', 3, 16.0702, 120.4019, TRUE),

    (v_mang_map, 'Mangaldan Public Market', 1, 16.0702, 120.4019, TRUE),
    (v_mang_map, 'Tulugan Junction', 2, 16.0312, 120.4688, FALSE),
    (v_mang_map, 'Mapandan Public Terminal', 3, 16.0247, 120.4549, TRUE),

    (v_map_dag, 'Mapandan Public Terminal', 1, 16.0247, 120.4549, TRUE),
    (v_map_dag, 'Calasiao Bus Stop', 2, 16.0788, 120.5609, FALSE),
    (v_map_dag, 'Dagupan City Bus Terminal', 3, 16.0912, 120.5948, TRUE),

    (v_dag_map, 'Dagupan City Bus Terminal', 1, 16.0912, 120.5948, TRUE),
    (v_dag_map, 'Calasiao Bus Stop', 2, 16.0788, 120.5609, FALSE),
    (v_dag_map, 'Mapandan Public Terminal', 3, 16.0247, 120.4549, TRUE),

    (v_map_man, 'Mapandan Public Terminal', 1, 16.0247, 120.4549, TRUE),
    (v_map_man, 'Urdaneta Junction', 2, 16.0571, 120.5140, FALSE),
    (v_map_man, 'Binalonan Stop', 3, 16.0498, 120.5012, FALSE),
    (v_map_man, 'Manaoag Public Terminal', 4, 16.0434, 120.4866, TRUE),

    (v_man_map, 'Manaoag Public Terminal', 1, 16.0434, 120.4866, TRUE),
    (v_man_map, 'Binalonan Stop', 2, 16.0498, 120.5012, FALSE),
    (v_man_map, 'Urdaneta Junction', 3, 16.0571, 120.5140, FALSE),
    (v_man_map, 'Mapandan Public Terminal', 4, 16.0247, 120.4549, TRUE);

  -- 4) Ensure route assignments for demo vehicles.
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

  UPDATE public.vehicle_routes vr
  SET is_active = FALSE
  FROM public.routes r
  WHERE vr.route_id = r.id
    AND vr.vehicle_id IN ('DRV-4821', 'DRV-2198')
    AND r.name NOT IN (
      'Mapandan to Mangaldan',
      'Mangaldan to Mapandan',
      'Mapandan to Dagupan',
      'Dagupan to Mapandan',
      'Mapandan to Manaoag',
      'Manaoag to Mapandan'
    )
    AND vr.is_active = TRUE;

  -- 5) Ensure terminal geofences are active and shared across routes.
  INSERT INTO public.geofences (name, route_id, center_lat, center_lng, radius_m, is_terminal, is_active)
  VALUES
    ('Mapandan Public Terminal', NULL, 16.0247, 120.4549, 200, TRUE, TRUE),
    ('Mangaldan Public Market', NULL, 16.0702, 120.4019, 200, TRUE, TRUE),
    ('Dagupan City Bus Terminal', NULL, 16.0912, 120.5948, 200, TRUE, TRUE),
    ('Manaoag Public Terminal', NULL, 16.0434, 120.4866, 200, TRUE, TRUE)
  ON CONFLICT (name) DO UPDATE
    SET route_id = NULL,
        center_lat = EXCLUDED.center_lat,
        center_lng = EXCLUDED.center_lng,
        radius_m = EXCLUDED.radius_m,
        is_terminal = EXCLUDED.is_terminal,
        is_active = TRUE,
        updated_at = NOW();
END;
$$;
