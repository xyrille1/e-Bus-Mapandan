import { supabase } from '../../../shared/supabase/client';

export type DeltaSyncResult = {
  changedEtaRows: number;
  changedStations: number;
  downloadBytes: number;
  newCursor: string;
};

export async function fetchDeltaSince(
  previousCursor: string,
  tripId?: string,
  routeId?: string
): Promise<DeltaSyncResult> {
  if (!supabase) {
    return {
      changedEtaRows: 0,
      changedStations: 0,
      downloadBytes: 0,
      newCursor: new Date().toISOString(),
    };
  }

  const pingQuery = supabase
    .from('gps_pings')
    .select('id, trip_id, lat, lng, speed_kph, timestamp')
    .gt('timestamp', previousCursor)
    .order('timestamp', { ascending: true })
    .limit(300);

  const filteredPingQuery = tripId ? pingQuery.eq('trip_id', tripId) : pingQuery;

  const [pingRes, stationRes] = await Promise.all([
    filteredPingQuery,
    routeId
      ? supabase
          .from('route_stations')
          .select('id, route_id, station_name, sequence_order, created_at')
          .eq('route_id', routeId)
          .gt('created_at', previousCursor)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const pings = pingRes.data ?? [];
  const stations = stationRes.data ?? [];
  const latestPingTs = pings.length > 0 ? pings[pings.length - 1].timestamp : null;
  const latestStationTs =
    stations.length > 0 ? stations[stations.length - 1].created_at : null;

  const newCursor = [latestPingTs, latestStationTs]
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1) ?? new Date().toISOString();

  const downloadBytes =
    new TextEncoder().encode(JSON.stringify(pings)).length +
    new TextEncoder().encode(JSON.stringify(stations)).length;

  const changedEtaRows = pings.length;
  const changedStations = stations.length;

  return {
    changedEtaRows,
    changedStations,
    downloadBytes,
    newCursor,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}
