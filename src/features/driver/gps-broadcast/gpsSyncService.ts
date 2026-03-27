/**
 * gpsSyncService.ts
 *
 * Bulk-uploads cached offline GPS pings to Supabase when connectivity resumes.
 * Called periodically by useGpsBroadcast during an active shift.
 *
 * Deduplication is handled server-side via the unique constraint on
 * (trip_id, timestamp) in gps_pings — the service just fires and marks
 * pings synced regardless of whether the server accepted or rejected them
 * as duplicates (conflict = already there = effectively synced).
 */

import { getDriverClient } from "../auth/driverSession";
import {
  CacheStats,
  getCacheStats,
  getUnsyncedPings,
  markPingsSynced,
} from "./gpsLocalCache";

export type SyncResult = {
  uploaded: number;
  failed: number;
  remaining: number;
};

type SyncPipelinePing = {
  id: string;
  trip_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  speed_kph: number;
  heading: number | null;
  timestamp: string;
};

async function runPostSyncPipelines(pings: SyncPipelinePing[]): Promise<void> {
  const client = getDriverClient();
  if (!client || pings.length === 0) return;

  await Promise.allSettled(
    pings.map((ping) => {
      const body = { type: "INSERT", record: ping };
      return Promise.allSettled([
        client.functions.invoke("recalculate-eta", { body }),
        client.functions.invoke("geofence-check", { body }),
      ]);
    }),
  );
}

/**
 * Upload up to `batchSize` unsynced pings from the local cache.
 * Returns counts for the caller to display in the UI banner.
 */
export async function syncOfflinePings(batchSize = 50): Promise<SyncResult> {
  const client = getDriverClient();
  if (!client) {
    const stats = getCacheStats();
    return { uploaded: 0, failed: 0, remaining: stats.unsyncedCount };
  }

  const pings = getUnsyncedPings(batchSize);
  if (pings.length === 0) {
    return { uploaded: 0, failed: 0, remaining: 0 };
  }

  // Strip the local `id` field — Supabase generates its own UUID primary key
  const payload = pings.map(({ id: _localId, is_synced: _flag, ...rest }) => ({
    ...rest,
    is_synced: true, // server-side field meaning the record came from cache
  }));

  // Supabase upsert: ON CONFLICT (trip_id, timestamp) DO NOTHING
  // This ensures network-flap duplicates are silently ignored
  const { error } = await client.from("gps_pings").upsert(payload, {
    onConflict: "trip_id,timestamp",
    ignoreDuplicates: true,
  });

  if (error) {
    // Network error — pings remain unsynced for next attempt
    const stats = getCacheStats();
    return {
      uploaded: 0,
      failed: pings.length,
      remaining: stats.unsyncedCount,
    };
  }

  // Mark all pings in the batch as synced (successful upsert or accepted duplicate)
  markPingsSynced(pings.map((p) => p.id));

  await runPostSyncPipelines(
    pings.map(
      ({ id: _localId, is_synced: _flag, accuracy_m: _acc, ...rest }) => ({
        ...rest,
        id: `offline-${rest.trip_id}-${rest.timestamp}`,
      }),
    ),
  );

  const afterStats: CacheStats = getCacheStats();
  return {
    uploaded: pings.length,
    failed: 0,
    remaining: afterStats.unsyncedCount,
  };
}
