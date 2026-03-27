/**
 * useShiftEnd.ts
 *
 * Manages the shift-end workflow:
 *  1. Driver taps "End Shift" (manual) or confirms a geofence prompt (#7)
 *  2. Any remaining unsynced GPS pings are flushed to Supabase
 *  3. Trip record is finalised (ended_at, distance_km written, status = completed)
 *  4. A summary is returned for the driver to review before submitting
 *  5. On Submit, the trip is marked complete and the driver is returned to
 *     Route Selection
 *
 * The hook wraps useGpsBroadcast.stopBroadcast() and coordinates the
 * final sync + trip finalisation in one atomic sequence.
 */

import { useCallback, useState } from 'react';
import { getDriverClient } from '../auth/driverSession';
import { getCacheStats } from '../gps-broadcast/gpsLocalCache';
import { syncOfflinePings } from '../gps-broadcast/gpsSyncService';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ShiftSummary = {
  tripId: string;
  vehicleId: string;
  routeName: string;
  startedAt: string;
  endedAt: string;
  durationMins: number;
  distanceKm: number;
  pingCount: number;
};

export type ShiftEndState = {
  phase: 'idle' | 'flushing' | 'reviewing' | 'submitting' | 'done' | 'error';
  summary: ShiftSummary | null;
  error: string | null;
};

type ShiftEndActions = {
  /**
   * Call when driver taps End Shift.
   * Stops GPS broadcast, flushes offline cache, fetches trip summary.
   * Returns the summary on success (for the review screen).
   */
  initiateEnd: (opts: {
    tripId: string;
    vehicleId: string;
    routeName: string;
    stopBroadcast: () => Promise<void>;
  }) => Promise<ShiftSummary | null>;
  /** Call when driver taps Submit on the summary screen. */
  submitTrip: () => Promise<boolean>;
  /** Reset back to idle (e.g. if driver cancels from summary). */
  cancel: () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Haversine distance in km between two lat/lng pairs. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useShiftEnd(): ShiftEndState & ShiftEndActions {
  const [state, setState] = useState<ShiftEndState>({
    phase: 'idle',
    summary: null,
    error: null,
  });

  const initiateEnd = useCallback(
    async ({
      tripId,
      vehicleId,
      routeName,
      stopBroadcast,
    }: {
      tripId: string;
      vehicleId: string;
      routeName: string;
      stopBroadcast: () => Promise<void>;
    }): Promise<ShiftSummary | null> => {
      setState({ phase: 'flushing', summary: null, error: null });

      // 1 — Stop GPS foreground service
      await stopBroadcast();

      // 2 — Flush remaining offline pings (drain cache completely)
      let remaining = getCacheStats().unsyncedCount;
      let attempts = 0;
      while (remaining > 0 && attempts < 10) {
        const result = await syncOfflinePings(50);
        remaining = result.remaining;
        attempts++;
        if (result.failed > 0) break; // network still down — can't drain fully
      }

      // 3 — Record the end timestamp
      const endedAt = new Date().toISOString();

      const client = getDriverClient();
      if (!client) {
        setState({ phase: 'error', summary: null, error: 'Session expired. Cannot finalise trip.' });
        return null;
      }

      // 4 — Fetch GPS pings to calculate distance and count
      const { data: pings, error: pingErr } = await client
        .from('gps_pings')
        .select('lat, lng, timestamp')
        .eq('trip_id', tripId)
        .order('timestamp', { ascending: true });

      if (pingErr) {
        setState({ phase: 'error', summary: null, error: `Failed to load pings: ${pingErr.message}` });
        return null;
      }

      type PingRow = { lat: number; lng: number; timestamp: string };
      const pingList = (pings ?? []) as PingRow[];

      // Sum great-circle distances between consecutive pings (proxy for road distance)
      let distanceKm = 0;
      for (let i = 1; i < pingList.length; i++) {
        distanceKm += haversineKm(
          pingList[i - 1].lat,
          pingList[i - 1].lng,
          pingList[i].lat,
          pingList[i].lng,
        );
      }

      // 5 — Fetch trip start time
      const { data: trip, error: tripErr } = await client
        .from('trips')
        .select('started_at')
        .eq('id', tripId)
        .single();

      if (tripErr || !trip?.started_at) {
        setState({ phase: 'error', summary: null, error: 'Cannot read trip record.' });
        return null;
      }

      const startedAt = trip.started_at as string;
      const durationMins = Math.max(
        1,
        Math.round(
          (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000,
        ),
      );

      const summary: ShiftSummary = {
        tripId,
        vehicleId,
        routeName,
        startedAt,
        endedAt,
        durationMins,
        distanceKm: Math.round(distanceKm * 10) / 10,
        pingCount: pingList.length,
      };

      setState({ phase: 'reviewing', summary, error: null });
      return summary;
    },
    [],
  );

  const submitTrip = useCallback(async (): Promise<boolean> => {
    const { summary } = state;
    if (!summary) return false;

    setState((prev) => ({ ...prev, phase: 'submitting' }));

    const client = getDriverClient();
    if (!client) {
      setState((prev) => ({
        ...prev,
        phase: 'error',
        error: 'Session expired. Cannot submit trip.',
      }));
      return false;
    }

    const { data, error } = await client.rpc('finalize_trip_transaction', {
      p_trip_id: summary.tripId,
      p_vehicle_id: summary.vehicleId,
      p_ended_at: summary.endedAt,
      p_distance_km: summary.distanceKm,
    });

    if (error || data !== true) {
      setState((prev) => ({
        ...prev,
        phase: 'error',
        error: `Submit failed: ${error?.message ?? 'Trip finalization was rejected.'}`,
      }));
      return false;
    }

    setState({ phase: 'done', summary, error: null });
    return true;
  }, [state]);

  const cancel = useCallback(() => {
    setState({ phase: 'idle', summary: null, error: null });
  }, []);

  return { ...state, initiateEnd, submitTrip, cancel };
}
