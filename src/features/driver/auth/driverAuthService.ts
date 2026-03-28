/**
 * driverAuthService.ts
 *
 * Calls the driver-login Edge Function, stores the resulting JWT in
 * Expo SecureStore, and owns the lifecycle of the driver session:
 *   loginDriver()          — authenticate, store, init session
 *   restoreDriverSession() — reload from SecureStore on app launch
 *   logoutDriver()         — wipe storage and clear in-memory session
 */

import * as SecureStore from "expo-secure-store";
import { supabase } from "../../../shared/supabase/client";
import { clearDriverSession, initDriverSession } from "./driverSession";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DriverLoginSuccess = {
  success: true;
  driverId: string;
  vehicleId: string;
  expiresAt: string;
};

export type DriverLoginFailure = {
  success: false;
  error: string;
  locked?: boolean;
  attemptsRemaining?: number;
};

export type DriverLoginResult = DriverLoginSuccess | DriverLoginFailure;

type StoredSession = {
  token: string;
  driver_id: string;
  vehicle_id: string;
  expires_at: string;
  error?: string;
  locked?: boolean;
  attempts_remaining?: number;
};

const SESSION_KEY = "driver_session_v1";
const LOGIN_TIMEOUT_MS = 15000;

type EdgeInvokeError = {
  message?: string;
  context?: {
    status?: number;
    json?: () => Promise<{
      error?: string;
      locked?: boolean;
      attempts_remaining?: number;
    }>;
    text?: () => Promise<string>;
    clone?: () => {
      json?: () => Promise<{
        error?: string;
        locked?: boolean;
        attempts_remaining?: number;
      }>;
      text?: () => Promise<string>;
    };
    body?: { error?: string; locked?: boolean; attempts_remaining?: number };
    error?: string;
  };
};

type ParsedEdgeLoginError = {
  message: string;
  locked?: boolean;
  attemptsRemaining?: number;
};

function mapStatusToFallbackMessage(status?: number): string {
  if (status === 401) {
    return "Invalid Vehicle ID or PIN.";
  }
  if (status === 423) {
    return "Account locked after 5 failed attempts. Admin reset required.";
  }
  if (status === 404) {
    return "driver-login function is not deployed. Deploy Supabase Edge Functions and try again.";
  }
  if (status && status >= 500) {
    return "Login server error. Check Supabase Edge Function logs.";
  }
  return "Login failed.";
}

async function extractEdgeErrorMessage(
  error: EdgeInvokeError,
): Promise<ParsedEdgeLoginError> {
  const context = error.context;
  const status = context?.status;

  const responseLike =
    context?.clone && typeof context.clone === "function"
      ? context.clone()
      : context;

  if (responseLike?.json && typeof responseLike.json === "function") {
    try {
      const body = await responseLike.json();
      if (body?.error) {
        return {
          message: body.error,
          locked: body.locked === true,
          attemptsRemaining:
            typeof body.attempts_remaining === "number"
              ? body.attempts_remaining
              : undefined,
        };
      }
      if (
        body &&
        (body.locked === true || typeof body.attempts_remaining === "number")
      ) {
        return {
          message: mapStatusToFallbackMessage(status),
          locked: body.locked === true,
          attemptsRemaining:
            typeof body.attempts_remaining === "number"
              ? body.attempts_remaining
              : undefined,
        };
      }
    } catch {
      // fall through to other error fields
    }
  }

  if (context?.json && typeof context.json === "function") {
    try {
      const body = await context.json();
      if (body?.error) {
        return { message: body.error };
      }
    } catch {
      // fall through to other error fields
    }
  }

  if (context?.body?.error) {
    return { message: context.body.error };
  }

  if (typeof context?.error === "string" && context.error.trim().length > 0) {
    return { message: context.error };
  }

  if (typeof error.message === "string" && error.message.trim().length > 0) {
    const normalized = error.message.toLowerCase();
    if (
      normalized.includes("failed to send a request to the edge function") ||
      normalized.includes("enotfound") ||
      normalized.includes("could not be resolved") ||
      normalized.includes("network request failed")
    ) {
      return {
        message:
          "Cannot reach the login server. Check EXPO_PUBLIC_SUPABASE_URL, internet connection, and that the driver-login function is deployed.",
      };
    }
    if (normalized.includes("non-2xx status code")) {
      return { message: mapStatusToFallbackMessage(status) };
    }
    return { message: error.message };
  }

  return { message: mapStatusToFallbackMessage(status) };
}

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * Calls the driver-login Edge Function with vehicle_id + PIN.
 * On success: stores the session in SecureStore and initialises the
 * authenticated Supabase client via initDriverSession().
 */
export async function loginDriver(
  vehicleId: string,
  pin: string,
): Promise<DriverLoginResult> {
  if (!supabase) {
    return {
      success: false,
      error: "No server connection. Check your network.",
    };
  }

  let invokeResult: {
    data: StoredSession | null;
    error: {
      message?: string;
      context?: { json?: () => Promise<{ error?: string }> };
    } | null;
  };
  try {
    invokeResult = await Promise.race([
      supabase.functions.invoke<StoredSession>("driver-login", {
        body: { vehicle_id: vehicleId.trim().toUpperCase(), pin: pin.trim() },
      }) as Promise<{
        data: StoredSession | null;
        error: {
          message?: string;
          context?: { json?: () => Promise<{ error?: string }> };
        } | null;
      }>,
      new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                "Login request timed out. Check your connection and try again.",
              ),
            ),
          LOGIN_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (invokeError) {
    const msg = (invokeError as Error).message || "";
    const normalized = msg.toLowerCase();
    if (
      normalized.includes("failed to send a request to the edge function") ||
      normalized.includes("enotfound") ||
      normalized.includes("could not be resolved") ||
      normalized.includes("network request failed")
    ) {
      return {
        success: false,
        error:
          "Cannot reach the login server. Check EXPO_PUBLIC_SUPABASE_URL, internet connection, and that the driver-login function is deployed.",
      };
    }
    return {
      success: false,
      error: msg || "Unable to reach the login server.",
    };
  }

  const { data, error } = invokeResult;

  if (error) {
    const parsed = await extractEdgeErrorMessage(error as EdgeInvokeError);
    return {
      success: false,
      error: parsed.message,
      locked: parsed.locked,
      attemptsRemaining: parsed.attemptsRemaining,
    };
  }

  // HTTP-level errors come back as data.error when invoke() doesn't throw
  if (!data?.token) {
    const isLocked = data?.locked === true;
    return {
      success: false,
      error: data?.error ?? "Unexpected server response.",
      locked: isLocked,
      attemptsRemaining:
        typeof data?.attempts_remaining === "number"
          ? (data.attempts_remaining as number)
          : undefined,
    };
  }

  const session: StoredSession = {
    token: data.token as string,
    driver_id: data.driver_id as string,
    vehicle_id: data.vehicle_id as string,
    expires_at: data.expires_at as string,
  };

  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  initDriverSession(session.token);

  return {
    success: true,
    driverId: session.driver_id,
    vehicleId: session.vehicle_id,
    expiresAt: session.expires_at,
  };
}

// ── Session restore ────────────────────────────────────────────────────────────

/**
 * Reads the stored session from SecureStore.
 * Returns the session if it has not expired; null otherwise (and cleans up).
 * Call this on app launch so the driver does not need to re-login mid-shift.
 */
export async function restoreDriverSession(): Promise<{
  driverId: string;
  vehicleId: string;
  expiresAt: string;
} | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as StoredSession;

    // Allow 60 s of clock-skew buffer before considering token expired
    const expiryMs = new Date(session.expires_at).getTime();
    if (expiryMs - 60_000 < Date.now()) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    }

    initDriverSession(session.token);
    return {
      driverId: session.driver_id,
      vehicleId: session.vehicle_id,
      expiresAt: session.expires_at,
    };
  } catch {
    // Corrupted storage — clear and let driver log in again
    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
    return null;
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

/** Removes the session from SecureStore and clears the in-memory client. */
export async function logoutDriver(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
  clearDriverSession();
}
