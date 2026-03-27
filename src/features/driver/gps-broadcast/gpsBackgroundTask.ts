/**
 * gpsBackgroundTask.ts
 *
 * Defines the Expo TaskManager background location task.
 * MUST be imported at the module top-level BEFORE any component renders
 * (add `import './src/features/driver/gps-broadcast/gpsBackgroundTask';`
 *  to App.tsx as the first driver-related import).
 *
 * How it works:
 *  1. useGpsBroadcast calls setTaskContext() with the active trip/driver IDs.
 *  2. startLocationUpdatesAsync() launches the Android Foreground Service and
 *     a persistent system notification keeping GPS alive when the phone is locked.
 *  3. Each location update hits this callback — first tries Supabase insert;
 *     on any failure, falls back to local SQLite cache (offline-first guarantee).
 */

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDriverClient } from "../auth/driverSession";
import { cacheGpsPing } from "./gpsLocalCache";

export const GPS_BROADCAST_TASK = "GPS_BROADCAST_TASK";

// Module-level context — safe to use here because the Android foreground service
// keeps the JS runtime alive whenever GPS_BROADCAST_TASK is running.
let _tripId: string | null = null;
let _driverId: string | null = null;

/** Set before calling startLocationUpdatesAsync. */
export function setTaskContext(tripId: string, driverId: string): void {
  _tripId = tripId;
  _driverId = driverId;
}

/** Clear on shift end or logout. */
export function clearTaskContext(): void {
  _tripId = null;
  _driverId = null;
}

type GpsPingRow = {
  id: string;
  trip_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  speed_kph: number;
  heading: number | null;
  timestamp: string;
};

async function runPostPingPipelines(
  client: SupabaseClient,
  ping: GpsPingRow,
): Promise<void> {
  const body = { type: "INSERT", record: ping };

  await Promise.allSettled([
    client.functions.invoke("recalculate-eta", { body }),
    client.functions.invoke("geofence-check", { body }),
  ]);
}

// ── Task definition (top-level, outside any component) ────────────────────────
TaskManager.defineTask(
  GPS_BROADCAST_TASK,
  async ({
    data,
    error,
  }: TaskManager.TaskManagerTaskBody<{
    locations: Location.LocationObject[];
  }>) => {
    if (error) {
      console.error("[GPS Task] error:", error.message);
      return;
    }

    const { locations } = data;
    if (!locations?.length) return;

    const tripId = _tripId;
    const driverId = _driverId;
    if (!tripId || !driverId) return;

    // Use the most recent reading from the batch
    const loc = locations[locations.length - 1];

    const ping = {
      trip_id: tripId,
      driver_id: driverId,
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      speed_kph: Math.max(0, (loc.coords.speed ?? 0) * 3.6), // m/s → km/h
      heading: loc.coords.heading ?? null,
      accuracy_m: loc.coords.accuracy ?? null,
      timestamp: new Date(loc.timestamp).toISOString(),
      is_synced: true,
    };

    const client = getDriverClient();
    if (client) {
      const { data: inserted, error: insertErr } = await client
        .from("gps_pings")
        .insert(ping)
        .select(
          "id, trip_id, driver_id, lat, lng, speed_kph, heading, timestamp",
        )
        .single();

      if (insertErr) {
        // Network unavailable or transient error — write to local cache
        cacheGpsPing({ ...ping, is_synced: false });
      } else if (inserted) {
        await runPostPingPipelines(client, inserted as GpsPingRow);
      }
    } else {
      // No authenticated client (e.g. session expired mid-shift) — cache locally
      cacheGpsPing({ ...ping, is_synced: false });
    }
  },
);
