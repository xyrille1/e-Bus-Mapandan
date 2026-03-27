import type { BusSnapshot } from '../../features/commuter/live-tracking-map/liveTrackingMock';
import { supabase } from './client';

type BusPositionRow = {
  id: string;
  plate_number: string;
  latitude: number;
  longitude: number;
  speed_kph: number;
  status: string;
  trip_id?: string | null;
  route_id?: string | null;
  route_name?: string | null;
  updated_at: string;
  eta_json?: string;
};

type CompletedTripRow = {
  id: string;
  vehicle_id: string;
  status: string;
  ended_at: string | null;
};

function mapStatus(status: string): BusSnapshot['status'] {
  if (status === 'idle') return 'At Terminal';
  if (status === 'offline') return 'Offline';
  if (status === 'delayed') return 'Delayed';
  return 'En Route';
}

function mapRow(row: BusPositionRow): BusSnapshot {
  return {
    id: row.id,
    plateNumber: row.plate_number,
    latitude: row.latitude,
    longitude: row.longitude,
    speedKph: row.speed_kph,
    status: mapStatus(row.status),
    tripId: row.trip_id ?? undefined,
    routeId: row.route_id ?? undefined,
    routeName: row.route_name ?? undefined,
    updatedAt: row.updated_at,
    etaJson: row.eta_json,
  };
}

/**
 * One-shot fetch of all currently active bus positions.
 * Used on initial mount so the map is populated before the first Realtime event fires.
 */
export async function fetchCurrentBusPositions(): Promise<BusSnapshot[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('bus_positions')
    .select('id, plate_number, latitude, longitude, speed_kph, status, trip_id, route_id, route_name, updated_at, eta_json')
    .order('updated_at', { ascending: false })
    .eq('status', 'active');
  if (error || !data) return [];
  return (data as BusPositionRow[]).map(mapRow);
}

/**
 * Subscribes to Supabase Realtime changes on the `bus_positions` table.
 * Calls `onPosition` each time a bus moves.
 * Returns an unsubscribe function — call it on component unmount.
 *
 * Expected Supabase table schema:
 *   CREATE TABLE bus_positions (
 *     id           TEXT PRIMARY KEY,
 *     plate_number TEXT,
 *     latitude     DOUBLE PRECISION,
 *     longitude    DOUBLE PRECISION,
 *     speed_kph    DOUBLE PRECISION,
 *     status       TEXT,
 *     updated_at   TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE bus_positions REPLICA IDENTITY FULL;
 *   -- Enable Realtime for this table in the Supabase dashboard.
 */
export function subscribeToBusPositions(
  onPosition: (bus: BusSnapshot) => void
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('bus-positions-live')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'bus_positions' },
      (payload) => {
        const row = payload.new as BusPositionRow;
        if (row?.id) {
          onPosition(mapRow(row));
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'bus_positions' },
      (payload) => {
        const row = payload.new as BusPositionRow;
        if (row?.id) {
          onPosition(mapRow(row));
        }
      }
    )
    .subscribe();

  return () => {
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
}

export function subscribeToTripCompletions(
  onTripCompleted: (trip: { id: string; vehicleId: string; endedAt: string | null }) => void
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('trip-completions-live')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'trips' },
      (payload) => {
        const row = payload.new as CompletedTripRow;
        if (row?.id && row.status === 'completed') {
          onTripCompleted({ id: row.id, vehicleId: row.vehicle_id, endedAt: row.ended_at });
        }
      }
    )
    .subscribe();

  return () => {
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
}
