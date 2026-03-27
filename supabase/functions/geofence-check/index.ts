// Edge Function: geofence-check
//
// Triggered by a Supabase database webhook after every INSERT into gps_pings.
// Evaluates whether the bus has entered a terminal geofence.
// If yes: sends an Expo push notification to the driver's device prompting
// "You've arrived at [Terminal]. End shift?"
//
// Deduplication: sends at most one prompt per terminal per trip by tracking
// the last geofence notification in a cooldown window (10 minutes).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEOFENCE_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type GpsPing = {
  id: string;
  trip_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  timestamp: string;
};

type Geofence = {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  is_terminal: boolean;
  route_id: string | null;
};

/** Great-circle distance in metres between two lat/lng points. */
function distanceMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Send an Expo push notification. Fire-and-forget — errors are logged, not thrown. */
async function sendExpoPush(
  expoPushToken: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        title,
        body,
        data,
        priority: "high",
      }),
    });
    if (!res.ok) {
      console.error("[geofence-check] Push failed:", await res.text());
    }
  } catch (err) {
    console.error("[geofence-check] Push error:", err);
  }
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
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ── Fetch trip to ensure it's still active ────────────────────────────────────
  const { data: trip } = await supabase
    .from("trips")
    .select("id, route_id, status")
    .eq("id", ping.trip_id)
    .eq("status", "active")
    .maybeSingle();

  if (!trip) {
    return new Response("Trip not active", {
      status: 200,
      headers: CORS_HEADERS,
    });
  }

  // ── Fetch active terminal geofences ───────────────────────────────────────────
  // Include geofences assigned to this specific route AND global ones (route_id IS NULL).
  // Global geofences (e.g. seed data without a route_id) work for any route.
  const { data: geofences } = await supabase
    .from("geofences")
    .select("id, name, center_lat, center_lng, radius_m, is_terminal, route_id")
    .eq("is_terminal", true)
    .eq("is_active", true);

  if (!geofences?.length) {
    return new Response("No geofences", { status: 200, headers: CORS_HEADERS });
  }

  // Filter: only use geofences that are either global (route_id null) or
  // explicitly assigned to the current trip's route.
  const applicable = (geofences as Geofence[]).filter(
    (gf) => gf.route_id === null || gf.route_id === trip.route_id,
  );

  if (!applicable.length) {
    return new Response("No geofences for this route", {
      status: 200,
      headers: CORS_HEADERS,
    });
  }

  // ── Check if bus is inside any applicable terminal geofence ──────────────────
  const triggered = applicable.find(
    (gf) =>
      distanceMetres(ping.lat, ping.lng, gf.center_lat, gf.center_lng) <=
      gf.radius_m,
  );

  if (!triggered) {
    return new Response("Not in any geofence", {
      status: 200,
      headers: CORS_HEADERS,
    });
  }

  // ── Deduplication: check if we already sent a prompt for this terminal recently ─
  const cooldownStart = new Date(
    Date.now() - GEOFENCE_COOLDOWN_MS,
  ).toISOString();
  const { data: recentAlert } = await supabase
    .from("geofence_alerts")
    .select("id")
    .eq("trip_id", ping.trip_id)
    .eq("geofence_id", triggered.id)
    .gte("sent_at", cooldownStart)
    .maybeSingle();

  if (recentAlert) {
    return new Response("Cooldown active — already prompted recently", {
      status: 200,
      headers: CORS_HEADERS,
    });
  }

  // ── Record alert send ─────────────────────────────────────────────────────────
  await supabase.from("geofence_alerts").insert({
    trip_id: ping.trip_id,
    driver_id: ping.driver_id,
    geofence_id: triggered.id,
    sent_at: new Date().toISOString(),
  });

  // ── Fetch driver's Expo push token ────────────────────────────────────────────
  const { data: driver } = await supabase
    .from("drivers")
    .select("expo_push_token")
    .eq("id", ping.driver_id)
    .maybeSingle();

  if (driver?.expo_push_token) {
    await sendExpoPush(
      driver.expo_push_token as string,
      `Arrived at ${triggered.name}`,
      "You've reached the terminal. End shift?",
      {
        type: "geofence_arrival",
        geofence_id: triggered.id,
        geofence_name: triggered.name,
        trip_id: ping.trip_id,
      },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, triggered_geofence: triggered.name }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
});
