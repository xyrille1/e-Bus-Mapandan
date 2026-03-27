/**
 * gpsLocalCache.ts
 *
 * SQLite-backed offline GPS ping cache for Feature #3.
 * Used by the background GPS task when a Supabase insert fails due to
 * network loss, and by the sync service to bulk-upload on reconnect.
 *
 * Table: offline_gps_pings (in bustrack.db)
 *   Unique constraint on (trip_id, timestamp) mirrors the server-side
 *   deduplication guard so duplicate uploads are rejected cleanly.
 */

import * as SQLite from "expo-sqlite";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OfflineGpsPing = {
  trip_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  speed_kph: number;
  heading: number | null;
  accuracy_m: number | null;
  timestamp: string; // ISO 8601
  is_synced: boolean;
};

type StoredGpsPing = OfflineGpsPing & { id: number };

// ── Database reference ────────────────────────────────────────────────────────

// expo-sqlite v16 uses the new synchronous openDatabaseSync API
const db = SQLite.openDatabaseSync("bustrack.db");

// ── Initialisation ─────────────────────────────────────────────────────────────

/**
 * Creates the offline_gps_pings table and index if they don't exist.
 * Safe to call multiple times; idempotent.
 */
export function initGpsCache(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS offline_gps_pings (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id    TEXT    NOT NULL,
      driver_id  TEXT    NOT NULL,
      lat        REAL    NOT NULL,
      lng        REAL    NOT NULL,
      speed_kph  REAL    NOT NULL DEFAULT 0,
      heading    REAL,
      accuracy_m REAL,
      timestamp  TEXT    NOT NULL,
      is_synced  INTEGER NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_offline_pings_trip_ts
      ON offline_gps_pings (trip_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_offline_pings_synced
      ON offline_gps_pings (is_synced);
  `);
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Insert a single offline GPS ping.
 * IGNORE on conflict means a duplicate (same trip_id + timestamp) is silently
 * dropped — the server will also reject it via its unique index.
 */
export function cacheGpsPing(ping: OfflineGpsPing): void {
  db.runSync(
    `INSERT OR IGNORE INTO offline_gps_pings
       (trip_id, driver_id, lat, lng, speed_kph, heading, accuracy_m, timestamp, is_synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ping.trip_id,
      ping.driver_id,
      ping.lat,
      ping.lng,
      ping.speed_kph,
      ping.heading ?? null,
      ping.accuracy_m ?? null,
      ping.timestamp,
      ping.is_synced ? 1 : 0,
    ],
  );
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Returns up to `limit` unsynced pings in chronological order.
 * Default limit keeps a single upload batch small to avoid blocking the JS thread.
 */
export function getUnsyncedPings(limit = 50): StoredGpsPing[] {
  const rows = db.getAllSync<{
    id: number;
    trip_id: string;
    driver_id: string;
    lat: number;
    lng: number;
    speed_kph: number;
    heading: number | null;
    accuracy_m: number | null;
    timestamp: string;
    is_synced: number;
  }>(
    `SELECT id, trip_id, driver_id, lat, lng, speed_kph, heading, accuracy_m,
            timestamp, is_synced
     FROM offline_gps_pings
     WHERE is_synced = 0
     ORDER BY timestamp ASC
     LIMIT ?`,
    [limit],
  );

  return rows.map((r) => ({
    id: r.id,
    trip_id: r.trip_id,
    driver_id: r.driver_id,
    lat: r.lat,
    lng: r.lng,
    speed_kph: r.speed_kph,
    heading: r.heading,
    accuracy_m: r.accuracy_m,
    timestamp: r.timestamp,
    is_synced: r.is_synced === 1,
  }));
}

/** Mark a batch of pings as synced after a successful upload. */
export function markPingsSynced(ids: number[]): void {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(",");
  db.runSync(
    `UPDATE offline_gps_pings SET is_synced = 1 WHERE id IN (${placeholders})`,
    ids,
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export type CacheStats = {
  unsyncedCount: number;
  oldestTimestamp: string | null;
};

export function getCacheStats(): CacheStats {
  const row = db.getFirstSync<{ cnt: number; oldest: string | null }>(
    `SELECT COUNT(*) AS cnt, MIN(timestamp) AS oldest
     FROM offline_gps_pings
     WHERE is_synced = 0`,
  );
  return {
    unsyncedCount: row?.cnt ?? 0,
    oldestTimestamp: row?.oldest ?? null,
  };
}
