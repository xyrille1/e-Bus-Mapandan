// Edge Function: change-pin
//
// POST { current_pin: string, new_pin: string }
// Authorization: Bearer <driver JWT>
//
// Validates the driver's current PIN via bcrypt, then replaces the stored
// hash with a bcrypt hash of the new PIN.  Requires authentication — the
// driver JWT is checked before any database operation is performed.
//
// Returns:
//   200: { ok: true }
//   400: Invalid input
//   401: Not authenticated / current PIN incorrect
//   403: Token missing driver_role claim

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BCRYPT_ROUNDS = 10;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/** Extract and validate the driver JWT from the Authorization header. */
async function verifyDriverJwt(
  authHeader: string | null,
  jwtSecret: string,
): Promise<{ driverId: string; vehicleId: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const headerB64 = parts[0].replace(/-/g, "+").replace(/_/g, "/");
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    // Verify signature
    const signingInput = `${parts[0]}.${parts[1]}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const claimedSig = Uint8Array.from(
      atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      claimedSig,
      new TextEncoder().encode(signingInput),
    );
    if (!valid) return null;

    // Decode payload
    const payload = JSON.parse(atob(payloadB64)) as Record<string, unknown>;

    // Check expiry
    if (
      typeof payload.exp === "number" &&
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    // Must be a driver token
    if (payload.driver_role !== "driver") return null;

    return {
      driverId: payload.sub as string,
      vehicleId: payload.vehicle_id as string,
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);

  // ── Auth ──────────────────────────────────────────────────────────────────────
  const jwtSecret =
    Deno.env.get("SUPABASE_JWT_SECRET") ?? Deno.env.get("JWT_SECRET");
  if (!jwtSecret) {
    return jsonResponse({ error: "Missing JWT secret configuration." }, 500);
  }
  const identity = await verifyDriverJwt(
    req.headers.get("authorization"),
    jwtSecret,
  );
  if (!identity) {
    return jsonResponse(
      { error: "Unauthorized. Valid driver session required." },
      401,
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────────
  let current_pin: string, new_pin: string;
  try {
    ({ current_pin, new_pin } = await req.json());
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (
    !current_pin ||
    typeof current_pin !== "string" ||
    current_pin.trim().length < 6
  ) {
    return jsonResponse(
      { error: "current_pin must be at least 6 characters" },
      400,
    );
  }
  if (!new_pin || typeof new_pin !== "string" || new_pin.trim().length < 6) {
    return jsonResponse(
      { error: "new_pin must be at least 6 characters" },
      400,
    );
  }
  if (current_pin.trim() === new_pin.trim()) {
    return jsonResponse({ error: "New PIN must differ from current PIN" }, 400);
  }

  // ── Fetch current hash ────────────────────────────────────────────────────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: driver, error: dbErr } = await supabase
    .from("drivers")
    .select("id, pin_hash, is_active")
    .eq("id", identity.driverId)
    .maybeSingle();

  if (dbErr || !driver) {
    return jsonResponse({ error: "Driver not found" }, 401);
  }
  if (!driver.is_active) {
    return jsonResponse({ error: "Account inactive" }, 401);
  }

  // ── Verify current PIN ────────────────────────────────────────────────────────
  const currentMatch = await bcrypt.compare(
    current_pin.trim(),
    driver.pin_hash as string,
  );
  if (!currentMatch) {
    return jsonResponse(
      {
        error: "Current PIN is incorrect. Change rejected.",
        current_pin_incorrect: true,
      },
      401,
    );
  }

  // ── Hash and store new PIN ────────────────────────────────────────────────────
  const newHash = await bcrypt.hash(new_pin.trim(), BCRYPT_ROUNDS);

  const { error: updateErr } = await supabase
    .from("drivers")
    .update({ pin_hash: newHash })
    .eq("id", identity.driverId);

  if (updateErr) {
    return jsonResponse(
      { error: `Failed to update PIN: ${updateErr.message}` },
      500,
    );
  }

  return jsonResponse({ ok: true });
});
