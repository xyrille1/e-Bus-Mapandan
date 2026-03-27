/**
 * driverSession.ts
 *
 * Module-level singleton that holds the authenticated Supabase client
 * for the logged-in driver.  Initialised by driverAuthService after
 * a successful login or session restore; cleared on logout.
 *
 * All driver feature hooks import getDriverClient() instead of the
 * shared anon client so every Supabase request carries the driver JWT
 * in the Authorization header, activating RLS policies correctly.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let _client: SupabaseClient | null = null;
let _jwt: string | null = null;

/** Call immediately after successful login or session restore. */
export function initDriverSession(jwt: string): void {
  _jwt = jwt;
  _client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${jwt}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: { params: { eventsPerSecond: 2 } },
  });
}

/** Call on logout or session expiry. */
export function clearDriverSession(): void {
  _jwt = null;
  _client = null;
}

/**
 * Returns the authenticated Supabase client for the current driver,
 * or null if no session is active.
 */
export function getDriverClient(): SupabaseClient | null {
  return _client;
}

/** Returns the raw driver JWT, or null if not authenticated. */
export function getDriverJwt(): string | null {
  return _jwt;
}
