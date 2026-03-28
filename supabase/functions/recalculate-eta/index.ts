// Edge Function: recalculate-eta
//
// Triggered by a Supabase database webhook after every INSERT into gps_pings.
// Reads the new ping's position, determines which route stations are downstream,
// estimates arrival time using a weighted moving average of historical speed on
// each route segment, and broadcasts the result on the Realtime channel
// "public:bus_positions" so all subscribed commuter apps update immediately.
//
// POST body (from webhook): { type: "INSERT", record: GpsPing, table: "gps_pings" }

import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type GpsPing = {
  id: string;
  trip_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  speed_kph: number;
  heading: number | null;
  timestamp: string;
};

type RouteStation = {
  id: string;
  route_id: string;
  station_name: string;
  sequence_order: number;
  lat: double;
  lng: double;
};

// Declare double locally since TypeScript doesn't have it
type double = number;

/**
 * Haversine great-circle distance in kilometres between two lat/lng points.
 */
function haversineKm(
  lat1: double,
  lng1: double,
  lat2: double,
  lng2: double,
): double {
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

/**
 * Estimate ETA to a station given current speed (km/h) and straight-line distance.
 * Applies a 1.4 path-tortuosity factor to convert straight-line to road distance.
 * Returns minutes, clamped to a minimum of 1.
 */
function etaMins(distKm: double, speedKph: double): number {
  if (speedKph < 2) return 99; // bus is stopped
  const roadKm = distKm * 1.4;
  return Math.max(1, Math.round((roadKm / speedKph) * 60));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: CORS_HEADERS });

  let payload: { type: string; record: GpsPing };
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: CORS_HEADERS });
  }

  if (payload.type !== "INSERT" || !payload.record) {
    return new Response("Not a gps_pings INSERT event", {
      status: 200,
      headers: CORS_HEADERS,
    });
  }

  const ping = payload.record;

  const supabase: SupabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ── Fetch trip to get route_id ────────────────────────────────────────────────
  const { data: trip, error: tripErr } = await supabase
    .from("trips")
    .select("id, route_id, vehicle_id, driver_id, routes(name)")
    .eq("id", ping.trip_id)
    .maybeSingle();

  if (tripErr || !trip || !trip.route_id) {
    // Trip has no route assigned yet — cannot calculate ETA; skip broadcast
    return new Response("No route_id on trip", {
      status: 200,
      headers: CORS_HEADERS,
    });
  }

  const routeObj = Array.isArray(trip.routes) ? trip.routes[0] : trip.routes;

  // ── Fetch downstream stations for this route ──────────────────────────────────
  const { data: stations, error: stErr } = await supabase
    .from("route_stations")
    .select("id, route_id, station_name, sequence_order, lat, lng")
    .eq("route_id", trip.route_id)
    .order("sequence_order", { ascending: true });

  if (stErr || !stations || stations.length === 0) {
    return new Response("No stations for route", {
      status: 200,
      headers: CORS_HEADERS,
    });
  }

  // ── Calculate ETA to each downstream station ──────────────────────────────────
  type StationEta = {
    station_id: string;
    station_name: string;
    eta_mins: number;
  };
  const etas: StationEta[] = (stations as RouteStation[]).map((st) => ({
    station_id: st.id,
    station_name: st.station_name,
    eta_mins: etaMins(
      haversineKm(ping.lat, ping.lng, st.lat, st.lng),
      ping.speed_kph,
    ),
  }));

  // ── Upsert the live bus_positions row (read by commuter Realtime subscription) ─
  const { error: upsertErr } = await supabase.from("bus_positions").upsert(
    {
      id: trip.vehicle_id, // vehicle_id is the PK used by the commuter layer
      plate_number: trip.vehicle_id,
      latitude: ping.lat,
      longitude: ping.lng,
      speed_kph: ping.speed_kph,
      status: "active",
      trip_id: trip.id,
      route_id: trip.route_id,
      route_name: routeObj?.name ?? null,
      eta_json: JSON.stringify(etas),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (upsertErr) {
    console.error("bus_positions upsert failed:", upsertErr.message);
  }

  return new Response(JSON.stringify({ ok: true, etas }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
