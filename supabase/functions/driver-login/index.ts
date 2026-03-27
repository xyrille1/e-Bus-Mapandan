// Edge Function: driver-login
// POST { vehicle_id: string, pin: string }
//
// Returns 200: { token, driver_id, vehicle_id, expires_in, expires_at }
// Returns 400: invalid input
// Returns 401: invalid credentials / inactive account
// Returns 423: account locked (5 consecutive failures)
//
// Security boundaries:
//  - PIN never transmitted as plaintext beyond TLS
//  - PIN is bcrypt-compared server-side; never echoed back
//  - JWT is signed with JWT_SECRET (or SUPABASE_JWT_SECRET fallback) via HS256
//  - Lockout is permanent until admin resets via dashboard

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SESSION_DURATION_SECONDS = 8 * 3600; // one full shift

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/**
 * Mint a Supabase-compatible HS256 JWT.
 * The token carries `role: 'authenticated'` so RLS treats it as a
 * logged-in user. `driver_role: 'driver'` is the custom discriminator
 * for driver-specific RLS policies.
 */
async function mintJwt(
  driverId: string,
  vehicleId: string,
  secret: string,
): Promise<string> {
  const base64url = (obj: unknown): string =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const now = Math.floor(Date.now() / 1000);
  const header = base64url({ alg: "HS256", typ: "JWT" });
  const payload = base64url({
    aud: "authenticated",
    iss: "supabase",
    iat: now,
    exp: now + SESSION_DURATION_SECONDS,
    sub: driverId,
    role: "authenticated",
    vehicle_id: vehicleId,
    driver_role: "driver", // custom RLS discriminator
  });

  const signingInput = `${header}.${payload}`;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const rawSig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const signature = btoa(String.fromCharCode(...new Uint8Array(rawSig)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${signature}`;
}

Deno.serve(async (req: Request) => {
  try {
    // Pre-flight
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: CORS_HEADERS });
    }
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    // ── Parse body ──────────────────────────────────────────────────────────────
    let vehicle_id: string, pin: string;
    try {
      ({ vehicle_id, pin } = await req.json());
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    // ── Input validation ────────────────────────────────────────────────────────
    if (!vehicle_id || typeof vehicle_id !== "string" || !vehicle_id.trim()) {
      return jsonResponse({ error: "vehicle_id is required" }, 400);
    }
    if (!pin || typeof pin !== "string" || pin.trim().length < 6) {
      return jsonResponse({ error: "PIN must be at least 6 characters" }, 400);
    }

    const normalizedId = vehicle_id.trim().toUpperCase();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const jwtSecret =
      Deno.env.get("SUPABASE_JWT_SECRET") ?? Deno.env.get("JWT_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !jwtSecret) {
      return jsonResponse(
        {
          error:
            "driver-login function is misconfigured. Missing required secrets.",
        },
        500,
      );
    }

    // ── Admin Supabase client (bypasses all RLS) ───────────────────────────────
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // ── Fetch driver row ────────────────────────────────────────────────────────
    const { data: driver, error: dbError } = await supabase
      .from("drivers")
      .select("id, vehicle_id, pin_hash, failed_attempts, locked_at, is_active")
      .eq("vehicle_id", normalizedId)
      .maybeSingle();

    // Treat missing record and DB errors identically → no enumeration of valid IDs
    if (dbError || !driver) {
      return jsonResponse({ error: "Invalid credentials" }, 401);
    }

    // ── Account state checks ────────────────────────────────────────────────────
    if (!driver.is_active) {
      return jsonResponse(
        { error: "Account inactive. Contact your administrator." },
        401,
      );
    }

    if (driver.failed_attempts >= 5 && driver.locked_at) {
      return jsonResponse(
        {
          error:
            "Account locked after 5 failed attempts. Admin reset required.",
          locked: true,
        },
        423,
      );
    }

    // ── bcrypt compare ──────────────────────────────────────────────────────────
    const match = await bcrypt.compare(pin.trim(), driver.pin_hash as string);

    if (!match) {
      const nextAttempts = driver.failed_attempts + 1;
      const failUpdate: Record<string, unknown> = {
        failed_attempts: nextAttempts,
      };
      if (nextAttempts >= 5) {
        failUpdate.locked_at = new Date().toISOString();
      }
      await supabase.from("drivers").update(failUpdate).eq("id", driver.id);

      if (nextAttempts >= 5) {
        return jsonResponse(
          {
            error:
              "Account locked after 5 failed attempts. Admin reset required.",
            locked: true,
          },
          423,
        );
      }
      return jsonResponse(
        {
          error: `Invalid credentials. ${5 - nextAttempts} attempt(s) remaining.`,
          attempts_remaining: 5 - nextAttempts,
        },
        401,
      );
    }

    // ── Success: reset lockout counters ─────────────────────────────────────────
    await supabase
      .from("drivers")
      .update({ failed_attempts: 0, locked_at: null })
      .eq("id", driver.id);

    // ── Mint 8-hour JWT ─────────────────────────────────────────────────────────
    const token = await mintJwt(driver.id, driver.vehicle_id, jwtSecret);

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = new Date(
      (now + SESSION_DURATION_SECONDS) * 1000,
    ).toISOString();

    return jsonResponse({
      token,
      driver_id: driver.id as string,
      vehicle_id: driver.vehicle_id as string,
      expires_in: SESSION_DURATION_SECONDS,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error("driver-login unexpected error", error);
    return jsonResponse(
      { error: "Unexpected server error during login." },
      500,
    );
  }
});
