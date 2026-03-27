/**
 * useRouteSelection.ts
 *
 * Fetches the list of routes assigned to the logged-in driver's vehicle,
 * and manages the "selected route" state that feeds into GPS broadcast
 * and the shift trip record.
 *
 * Data flow:
 *   Supabase vehicle_routes JOIN routes  →  routeList
 *   Driver taps a route                 →  selectedRoute set
 *   Confirm tapped                      →  onConfirm(route) called by parent
 *
 * RLS ensures the driver only sees routes assigned to their vehicle_id,
 * enforced server-side via the JWT claim `vehicle_id`.
 */

import { useCallback, useEffect, useState } from 'react';
import { getDriverClient } from '../auth/driverSession';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DriverRoute = {
  id: string;          // routes.id (UUID)
  name: string;        // e.g. "Manaoag to Dagupan"
  shortCode: string | null;
  stationCount: number;
};

export type RouteSelectionState = {
  isLoading: boolean;
  routes: DriverRoute[];
  selectedRoute: DriverRoute | null;
  error: string | null;
};

type RouteSelectionActions = {
  selectRoute: (route: DriverRoute) => void;
  confirmSelection: () => DriverRoute | null;
  retry: () => void;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRouteSelection(): RouteSelectionState & RouteSelectionActions {
  const [state, setState] = useState<RouteSelectionState>({
    isLoading: true,
    routes: [],
    selectedRoute: null,
    error: null,
  });

  const loadRoutes = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const client = getDriverClient();
    if (!client) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Session expired. Please log in again.',
      }));
      return;
    }

    // Join vehicle_routes → routes, filtered to this driver's vehicle by RLS
    const { data, error } = await client
      .from('vehicle_routes')
      .select(
        `
          route_id,
          routes (
            id,
            name,
            short_code,
            route_stations ( id )
          )
        `,
      )
      .eq('is_active', true);

    type RawRow = {
      route_id: string;
      routes: {
        id: string;
        name: string;
        short_code: string | null;
        route_stations: { id: string }[];
      } | { id: string; name: string; short_code: string | null; route_stations: { id: string }[] }[] | null;
    };

    const toRoutes = (rows: RawRow[]): DriverRoute[] => rows
      .map((row) => {
        const r = Array.isArray(row.routes) ? row.routes[0] : row.routes;
        if (!r) return null;
        return {
          id: r.id,
          name: r.name,
          shortCode: r.short_code,
          stationCount: r.route_stations?.length ?? 0,
        } satisfies DriverRoute;
      })
      .filter((r): r is DriverRoute => r !== null);

    let routes: DriverRoute[] = toRoutes((data ?? []) as unknown as RawRow[]);
    let loadError: string | null = error ? `Assigned-routes lookup failed: ${error.message}` : null;

    // Fallback for environments where vehicle_routes has not been seeded yet:
    // load active routes so the driver can still select and start a shift.
    if (routes.length === 0) {
      const { data: fallbackData, error: fallbackError } = await client
        .from('routes')
        .select(
          `
            id,
            name,
            short_code,
            route_stations ( id )
          `,
        )
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!fallbackError && fallbackData) {
        type FallbackRow = {
          id: string;
          name: string;
          short_code: string | null;
          route_stations: { id: string }[];
        };

        routes = (fallbackData as FallbackRow[]).map((r) => ({
          id: r.id,
          name: r.name,
          shortCode: r.short_code,
          stationCount: r.route_stations?.length ?? 0,
        }));
      } else if (fallbackError) {
        loadError = loadError
          ? `${loadError} | Active-routes fallback failed: ${fallbackError.message}`
          : `Failed to load routes: ${fallbackError.message}`;
      }
    }

    setState((prev) => ({
      ...prev,
      isLoading: false,
      routes,
      error: routes.length === 0 ? loadError : null,
      selectedRoute:
        prev.selectedRoute && routes.some((r) => r.id === prev.selectedRoute?.id)
          ? prev.selectedRoute
          : routes[0] ?? null,
    }));
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const selectRoute = useCallback((route: DriverRoute) => {
    setState((prev) => ({ ...prev, selectedRoute: route }));
  }, []);

  /**
   * Returns the selected route if confirmed, or null if nothing is selected.
   * The caller (App.tsx or a screen component) uses the returned route to
   * advance the flow to the Pre-Shift Checklist.
   */
  const confirmSelection = useCallback((): DriverRoute | null => {
    return state.selectedRoute;
  }, [state.selectedRoute]);

  const retry = useCallback(() => {
    loadRoutes();
  }, [loadRoutes]);

  return { ...state, selectRoute, confirmSelection, retry };
}
