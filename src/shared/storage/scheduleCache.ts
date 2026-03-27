import * as SQLite from "expo-sqlite";

export type CachedSchedule = {
  routeName: string;
  stationName: string;
  upcomingBuses: string[];
  lastSyncAt: string;
  source: "cache" | "network";
};

// Static seed used for the very first synchronous render before SQLite is ready.
const SEED: CachedSchedule = {
  routeName: "Manaoag to Dagupan",
  stationName: "Manaoag Public Terminal",
  upcomingBuses: [
    "Arriving in 6 mins",
    "Arriving in 17 mins",
    "Arriving in 29 mins",
  ],
  lastSyncAt: "2026-03-20T07:10:00.000Z",
  source: "cache",
};

// In-memory mirror kept in sync with SQLite; returned synchronously for instant first render.
let _memSnapshot: CachedSchedule = SEED;

export function getSeedSnapshot(): CachedSchedule {
  return _memSnapshot;
}

// ─── SQLite ─────────────────────────────────────────────────────────────────

let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_dbPromise) {
    _dbPromise = SQLite.openDatabaseAsync("bustrack.db").then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS schedule_cache (
          id          INTEGER PRIMARY KEY NOT NULL,
          route_name  TEXT    NOT NULL,
          station_name TEXT   NOT NULL,
          upcoming_buses TEXT NOT NULL,
          last_sync_at TEXT   NOT NULL,
          source      TEXT    NOT NULL
        );
      `);
      return db;
    });
  }
  return _dbPromise;
}

type ScheduleRow = {
  route_name: string;
  station_name: string;
  upcoming_buses: string;
  last_sync_at: string;
  source: string;
};

/** Read the persisted schedule from SQLite.  Fast (~10–30 ms on device).
 *  Seeds the row on first install and updates _memSnapshot. */
export async function readCachedSchedule(): Promise<CachedSchedule> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<ScheduleRow>(
      "SELECT route_name, station_name, upcoming_buses, last_sync_at, source FROM schedule_cache WHERE id = 1",
    );

    if (!row) {
      // First install — persist the seed
      await db.runAsync(
        "INSERT INTO schedule_cache (id, route_name, station_name, upcoming_buses, last_sync_at, source) VALUES (?, ?, ?, ?, ?, ?)",
        1,
        SEED.routeName,
        SEED.stationName,
        JSON.stringify(SEED.upcomingBuses),
        SEED.lastSyncAt,
        SEED.source,
      );
      _memSnapshot = SEED;
      return SEED;
    }

    const schedule: CachedSchedule = {
      routeName: row.route_name,
      stationName: row.station_name,
      upcomingBuses: JSON.parse(row.upcoming_buses) as string[],
      lastSyncAt: row.last_sync_at,
      source: row.source as "cache" | "network",
    };
    _memSnapshot = schedule;
    return schedule;
  } catch {
    return SEED;
  }
}

/** Persist an updated schedule to SQLite so the next cold start sees fresh data. */
export async function writeCachedSchedule(
  schedule: CachedSchedule,
): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO schedule_cache
         (id, route_name, station_name, upcoming_buses, last_sync_at, source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      1,
      schedule.routeName,
      schedule.stationName,
      JSON.stringify(schedule.upcomingBuses),
      schedule.lastSyncAt,
      schedule.source,
    );
    _memSnapshot = schedule;
  } catch {
    // Write failure is non-fatal — cached view stays usable.
  }
}

// ─── Network fetch (uses Supabase when configured) ──────────────────────────

export async function fetchScheduleDelta(): Promise<CachedSchedule> {
  // Lazy-import keeps Supabase client out of the synchronous boot path.
  const { supabase } = await import("../supabase/client");

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase
    .from("schedules")
    .select("route_name, station_name, upcoming_buses")
    .eq("route_name", "Manaoag to Dagupan")
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("Schedule fetch failed");
  }

  return {
    routeName: data.route_name as string,
    stationName: data.station_name as string,
    upcomingBuses: data.upcoming_buses as string[],
    lastSyncAt: new Date().toISOString(),
    source: "network",
  };
}
