/**
 * useGpsBroadcast.ts
 *
 * React hook that owns the full GPS broadcast lifecycle for an active shift.
 *
 * On startBroadcast():
 *  1. Requests foreground + background location permissions
 *  2. Creates a `trips` row in Supabase (status: active)
 *  3. Launches the Android Foreground Service via startLocationUpdatesAsync
 *  4. Subscribes to a foreground location watch for real-time UI updates (speed)
 *  5. Starts a sync loop that uploads offline-cached pings on reconnect
 *
 * On stopBroadcast():
 *  1. Removes the foreground location subscription
 *  2. Stops the background location task (kills the foreground service notification)
 *  3. Returns the trip_id to the caller (used by useShiftEnd to finalise the trip)
 *
 * Connection status machine:
 *   online → (network drops) → offline → (network restores, cache > 0) → syncing → online
 */

import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getDriverClient } from '../auth/driverSession';
import {
  GPS_BROADCAST_TASK,
  clearTaskContext,
  setTaskContext,
} from './gpsBackgroundTask';
import { getCacheStats, initGpsCache } from './gpsLocalCache';
import { syncOfflinePings } from './gpsSyncService';
import { useBatterySavingGps, type GpsMode } from './useBatterySavingGps';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BroadcastStatus = 'idle' | 'starting' | 'active' | 'stopping';
export type ConnectionStatus = 'online' | 'offline' | 'syncing';

export type GpsBroadcastState = {
  status: BroadcastStatus;
  connectionStatus: ConnectionStatus;
  /** Active trip UUID, null when idle */
  tripId: string | null;
  /** Current speed from GPS sensor (km/h) */
  speedKph: number;
  /** ISO timestamp of the last GPS reading */
  lastPingAt: string | null;
  /** Number of pings waiting to be uploaded */
  unsyncedPingCount: number;
  /** Human-readable error message if startup fails */
  error: string | null;
  /** ISO timestamp when the current trip record was created (shift start time) */
  tripStartedAt: string | null;
  /** True when GPS is running in battery-saving mode (battery < 20%) */
  isBatterySaving: boolean;
  /** Current GPS accuracy mode */
  gpsMode: GpsMode;
};

type StartOptions = {
  driverId: string;
  vehicleId: string;
  routeId: string;
};

type GpsBroadcastActions = {
  startBroadcast: (opts: StartOptions) => Promise<string | null>; // returns tripId or null on error
  stopBroadcast: () => Promise<void>;
};

const TICK_MS = parseInt(process.env.EXPO_PUBLIC_LIVE_TICK_MS ?? '5000', 10);

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGpsBroadcast(): GpsBroadcastState & GpsBroadcastActions {
  const [state, setState] = useState<GpsBroadcastState>({
    status: 'idle',
    connectionStatus: 'online',
    tripId: null,
    speedKph: 0,
    lastPingAt: null,
    unsyncedPingCount: 0,
    error: null,
    tripStartedAt: null,
    isBatterySaving: false,
    gpsMode: 'high-accuracy',
  });

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tripIdRef = useRef<string | null>(null);
  const statusRef = useRef<BroadcastStatus>('idle');

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  // Battery-saving GPS mode (Feature #10)
  const battery = useBatterySavingGps(state.status === 'active');
  const batteryRef = useRef(battery);
  useEffect(() => { batteryRef.current = battery; }, [battery]);

  // Mirror battery mode into broadcast state so the UI can show the banner
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isBatterySaving: battery.isBatterySaving,
      gpsMode: battery.gpsMode,
    }));
  }, [battery.isBatterySaving, battery.gpsMode]);

  // When GPS mode changes while shift is active, restart location services
  // with the new accuracy/interval from useBatterySavingGps
  useEffect(() => {
    if (state.status !== 'active' || !tripIdRef.current) return;

    const opts = batteryRef.current.getLocationOptions();
    const notifBody = batteryRef.current.gpsMode === 'battery-saving'
      ? 'GPS in battery-saving mode. Shift continues at reduced accuracy.'
      : 'GPS broadcasting. Your route is being tracked.';

    // Restart foreground watch for real-time UI speed display
    locationSubRef.current?.remove();
    Location.watchPositionAsync(opts, (loc) => {
      setState((prev) => ({
        ...prev,
        speedKph: Math.max(0, (loc.coords.speed ?? 0) * 3.6),
        lastPingAt: new Date(loc.timestamp).toISOString(),
      }));
    }).then((sub) => { locationSubRef.current = sub; });

    // Restart background task with new accuracy / interval
    (async () => {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(GPS_BROADCAST_TASK);
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(GPS_BROADCAST_TASK);
        await Location.startLocationUpdatesAsync(GPS_BROADCAST_TASK, {
          ...opts,
          foregroundService: {
            notificationTitle: 'BusTrack PH — Shift Active',
            notificationBody: notifBody,
            notificationColor: '#1A6B42',
          },
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
        });
      }
    })();
  // Re-run only when the GPS mode toggles (not on every render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battery.gpsMode]);

  // Initialise SQLite cache once on mount
  useEffect(() => {
    initGpsCache();
  }, []);

  // ── Connectivity + sync loop (runs only while shift is active) ───────────────
  useEffect(() => {
    if (state.status !== 'active') return;

    const checkAndSync = async () => {
      const net = await Network.getNetworkStateAsync();
      const isOnline = net.isInternetReachable === true;
      const stats = getCacheStats();

      if (isOnline && stats.unsyncedCount > 0) {
        setState((prev) => ({
          ...prev,
          connectionStatus: 'syncing',
          unsyncedPingCount: stats.unsyncedCount,
        }));
        await syncOfflinePings(30);
        const after = getCacheStats();
        setState((prev) => ({
          ...prev,
          connectionStatus: after.unsyncedCount > 0 ? 'syncing' : 'online',
          unsyncedPingCount: after.unsyncedCount,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          connectionStatus: isOnline ? 'online' : 'offline',
          unsyncedPingCount: stats.unsyncedCount,
        }));
      }
    };

    syncIntervalRef.current = setInterval(checkAndSync, TICK_MS);
    checkAndSync(); // immediate first check

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [state.status]);

  // ── Start broadcast ───────────────────────────────────────────────────────────
  const startBroadcast = useCallback(
    async ({ driverId, vehicleId, routeId }: StartOptions): Promise<string | null> => {
      if (statusRef.current !== 'idle') {
        return tripIdRef.current;
      }

      setState((prev) => ({ ...prev, status: 'starting', error: null }));

      // 1 — Location permissions
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        setState((prev) => ({
          ...prev,
          status: 'idle',
          error: 'Location permission denied. Enable it in device settings.',
        }));
        return null;
      }

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        setState((prev) => ({
          ...prev,
          status: 'idle',
          error: 'Background location permission denied. The app needs it to track your shift.',
        }));
        return null;
      }

      // 2 — Create trip record in Supabase
      const client = getDriverClient();
      if (!client) {
        setState((prev) => ({ ...prev, status: 'idle', error: 'Session expired. Please log in again.' }));
        return null;
      }

      const { data: trip, error: tripErr } = await client
        .from('trips')
        .insert({ driver_id: driverId, vehicle_id: vehicleId, route_id: routeId, status: 'active' })
        .select('id, started_at')
        .single();

      if (tripErr || !trip?.id) {
        setState((prev) => ({
          ...prev,
          status: 'idle',
          error: `Failed to start trip: ${tripErr?.message ?? 'Unknown error'}`,
        }));
        return null;
      }

      const tripId: string = trip.id as string;
      const tripStartedAt: string = (trip.started_at as string) ?? new Date().toISOString();
      tripIdRef.current = tripId;

      let immediateLastPingAt: string | null = null;
      let immediateSpeedKph: number | null = null;

      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const firstPing = {
          trip_id: tripId,
          driver_id: driverId,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          speed_kph: Math.max(0, (loc.coords.speed ?? 0) * 3.6),
          heading: loc.coords.heading ?? null,
          accuracy_m: loc.coords.accuracy ?? null,
          timestamp: new Date(loc.timestamp).toISOString(),
          is_synced: true,
        };

        const { data: inserted } = await client
          .from('gps_pings')
          .insert(firstPing)
          .select('id, trip_id, driver_id, lat, lng, speed_kph, heading, timestamp')
          .single();

        if (inserted) {
          const body = { type: 'INSERT', record: inserted };
          await Promise.allSettled([
            client.functions.invoke('recalculate-eta', { body }),
            client.functions.invoke('geofence-check', { body }),
          ]);
        }

        immediateLastPingAt = firstPing.timestamp;
        immediateSpeedKph = firstPing.speed_kph;
      } catch {
        // If immediate position fails, regular foreground/background streams still continue.
      }

      // 3 — Register context for the background task
      setTaskContext(tripId, driverId);

      // 4 — Start Android Foreground Service + background location task
      const locationOpts = batteryRef.current.getLocationOptions();
      await Location.startLocationUpdatesAsync(GPS_BROADCAST_TASK, {
        ...locationOpts,
        foregroundService: {
          notificationTitle: 'BusTrack PH — Shift Active',
          notificationBody: 'GPS broadcasting. Your route is being tracked.',
          notificationColor: '#1A6B42',
        },
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      });

      // 5 — Subscribe to foreground location for real-time UI speed display
      locationSubRef.current = await Location.watchPositionAsync(
        locationOpts,
        (loc) => {
          setState((prev) => ({
            ...prev,
            speedKph: Math.max(0, (loc.coords.speed ?? 0) * 3.6),
            lastPingAt: new Date(loc.timestamp).toISOString(),
          }));
        },
      );

      setState((prev) => ({
        ...prev,
        status: 'active',
        tripId,
        tripStartedAt,
        lastPingAt: immediateLastPingAt ?? new Date().toISOString(),
        speedKph: immediateSpeedKph ?? prev.speedKph,
      }));

      return tripId;
    },
    [],
  );

  // ── Stop broadcast ────────────────────────────────────────────────────────────
  const stopBroadcast = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'stopping' }));

    // Remove foreground location watch
    locationSubRef.current?.remove();
    locationSubRef.current = null;

    // Stop background task + foreground service notification
    tripIdRef.current = null;
    clearTaskContext();
    const isRunning = await Location.hasStartedLocationUpdatesAsync(GPS_BROADCAST_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(GPS_BROADCAST_TASK);
    }

    setState((prev) => ({
      ...prev,
      status: 'idle',
      tripId: null,
      tripStartedAt: null,
      speedKph: 0,
      lastPingAt: null,
      isBatterySaving: false,
      gpsMode: 'high-accuracy',
    }));
  }, []);

  return { ...state, startBroadcast, stopBroadcast };
}
