/**
 * useActiveShiftStatus.ts — Feature #6
 *
 * Provides real-time display data for the Active Shift status screen.
 * Read-only — no interactive elements during driving.
 *
 * Data sources:
 *   - Device GPS sensor (speed, location) via expo-location watchPositionAsync
 *   - Supabase connection state via expo-network
 *   - Trip start timestamp from the trips table
 *
 * The hook is intentionally display-only.  GPS and Supabase inserts
 * are handled by useGpsBroadcast; this hook only reads data.
 *
 * Update rate: every EXPO_PUBLIC_LIVE_TICK_MS ms (default 5 000 ms) matching
 * the GPS ping interval so the UI and the broadcast are always in sync.
 */

import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { useEffect, useRef, useState } from 'react';
import { getDriverClient } from '../auth/driverSession';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConnectionStatus = 'online' | 'offline' | 'syncing';

export type ActiveShiftStatusState = {
  /** Current speed from device GPS sensor (km/h) */
  speedKph: number;
  /** Current GPS coordinates */
  latitude: number | null;
  longitude: number | null;
  /** Human-readable elapsed shift time, e.g. "2h 14m" */
  elapsedTime: string;
  /** Minutes as a number for programmatic use */
  elapsedMins: number;
  /** Network + Supabase sync state */
  connectionStatus: ConnectionStatus;
  /** ISO timestamp of last successful GPS broadcast */
  lastPingAt: string | null;
  /** True if GPS has a valid fix */
  hasGpsFix: boolean;
};

const TICK_MS = parseInt(process.env.EXPO_PUBLIC_LIVE_TICK_MS ?? '5000', 10);

function formatElapsed(startedAt: string): { label: string; mins: number } {
  const mins = Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000),
  );
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return {
    label: h > 0 ? `${h}h ${m}m` : `${m}m`,
    mins,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useActiveShiftStatus(opts: {
  tripId: string | null;
  shiftStartedAt: string | null;
  /** Pass the unsynced count from useGpsBroadcast to show sync banner */
  unsyncedPingCount: number;
}): ActiveShiftStatusState {
  const { tripId, shiftStartedAt, unsyncedPingCount } = opts;

  const [state, setState] = useState<ActiveShiftStatusState>({
    speedKph: 0,
    latitude: null,
    longitude: null,
    elapsedTime: '0m',
    elapsedMins: 0,
    connectionStatus: 'online',
    lastPingAt: null,
    hasGpsFix: false,
  });

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Connect/disconnect location watch based on active trip ───────────────────
  useEffect(() => {
    if (!tripId) {
      locationSubRef.current?.remove();
      locationSubRef.current = null;
      return;
    }

    let cancelled = false;
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: TICK_MS, distanceInterval: 5 },
      (loc) => {
        setState((prev) => ({
          ...prev,
          speedKph: Math.max(0, (loc.coords.speed ?? 0) * 3.6),
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          hasGpsFix: true,
          lastPingAt: new Date(loc.timestamp).toISOString(),
        }));
      },
    ).then((sub) => {
      if (cancelled) { sub.remove(); return; }
      locationSubRef.current = sub;
    });

    return () => {
      cancelled = true;
      locationSubRef.current?.remove();
      locationSubRef.current = null;
    };
  }, [tripId]);

  // ── Tick: update elapsed time + connectivity ──────────────────────────────────
  useEffect(() => {
    if (!tripId || !shiftStartedAt) return;

    const tick = async () => {
      const { label, mins } = formatElapsed(shiftStartedAt);
      const net = await Network.getNetworkStateAsync();
      const isOnline = net.isInternetReachable === true;

      let connStatus: ConnectionStatus = isOnline ? 'online' : 'offline';
      if (isOnline && unsyncedPingCount > 0) connStatus = 'syncing';

      setState((prev) => ({
        ...prev,
        elapsedTime: label,
        elapsedMins: mins,
        connectionStatus: connStatus,
      }));
    };

    tick();
    tickRef.current = setInterval(tick, TICK_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [tripId, shiftStartedAt, unsyncedPingCount]);

  // ── Fetch last ping timestamp from Supabase on mount ─────────────────────────
  useEffect(() => {
    if (!tripId) return;

    const client = getDriverClient();
    if (!client) return;

    client
      .from('gps_pings')
      .select('timestamp')
      .eq('trip_id', tripId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.timestamp) {
          setState((prev) => ({
            ...prev,
            lastPingAt: data.timestamp as string,
          }));
        }
      });
  }, [tripId]);

  return state;
}
