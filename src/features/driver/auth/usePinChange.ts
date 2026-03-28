/**
 * usePinChange.ts — Feature #9
 *
 * Allows a driver to change their own PIN from the Settings screen.
 * Calls the change-pin Edge Function which validates the current PIN
 * server-side via bcrypt before writing the new hash.
 *
 * Security: current PIN verification is mandatory — no skipping.
 * The driver JWT is sent in the Authorization header so the server
 * can identify the caller without a second credential lookup.
 */

import { useCallback, useState } from "react";
import { supabase } from "../../../shared/supabase/client";
import { getDriverJwt } from "../auth/driverSession";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PinChangeState = {
  phase: "idle" | "submitting" | "success" | "error";
  error: string | null;
};

type PinChangeActions = {
  changePin: (
    currentPin: string,
    newPin: string,
    confirmNewPin: string,
  ) => Promise<void>;
  reset: () => void;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePinChange(): PinChangeState & PinChangeActions {
  const [state, setState] = useState<PinChangeState>({
    phase: "idle",
    error: null,
  });

  const changePin = useCallback(
    async (currentPin: string, newPin: string, confirmNewPin: string) => {
      // ── Client-side validation ───────────────────────────────────────────────
      if (currentPin.trim().length < 6) {
        setState({
          phase: "error",
          error: "Current PIN must be at least 6 digits.",
        });
        return;
      }
      if (newPin.trim().length < 6) {
        setState({
          phase: "error",
          error: "New PIN must be at least 6 digits.",
        });
        return;
      }
      if (newPin.trim() !== confirmNewPin.trim()) {
        setState({ phase: "error", error: "New PINs do not match." });
        return;
      }
      if (currentPin.trim() === newPin.trim()) {
        setState({
          phase: "error",
          error: "New PIN must be different from current PIN.",
        });
        return;
      }

      setState({ phase: "submitting", error: null });

      const jwt = getDriverJwt();
      if (!supabase || !jwt) {
        setState({
          phase: "error",
          error: "Session expired. Please log in again.",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("change-pin", {
        body: { current_pin: currentPin, new_pin: newPin },
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (error || !data?.ok) {
        const msg =
          (error as { message?: string } | null)?.message ??
          (data?.error as string | undefined) ??
          "PIN change failed. Try again.";
        setState({ phase: "error", error: msg });
        return;
      }

      setState({ phase: "success", error: null });
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ phase: "idle", error: null });
  }, []);

  return { ...state, changePin, reset };
}
