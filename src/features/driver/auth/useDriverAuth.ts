/**
 * useDriverAuth.ts
 *
 * React hook that owns all driver auth state.
 * On mount it attempts to restore a stored session from SecureStore;
 * after that, login() and logout() drive the state machine.
 *
 * Usage in App.tsx:
 *   const driverAuth = useDriverAuth();
 *   driverAuth.login(vehicleId, pin);
 *   driverAuth.logout();
 *   driverAuth.isAuthenticated — true once session is active
 */

import { useCallback, useEffect, useState } from "react";
import {
  loginDriver,
  logoutDriver,
  restoreDriverSession,
} from "./driverAuthService";

export type DriverAuthState = {
  /** True while a login request or session restore is in progress. */
  isLoading: boolean;
  /** True once a valid session is active. */
  isAuthenticated: boolean;
  /** UUID of the authenticated driver row, or null. */
  driverId: string | null;
  /** Vehicle ID string (e.g. "DRV-4821"), or null. */
  vehicleId: string | null;
  /** Last error message to show on the login screen. */
  error: string | null;
  /** True when the account is locked (5 consecutive failures). */
  isLocked: boolean;
  /** Remaining attempts before lockout (counts down from 4 → 1 → locked). */
  attemptsRemaining: number;
};

type DriverAuthActions = {
  /** Call with Vehicle ID and raw PIN from the input fields. */
  login: (vehicleId: string, pin: string) => Promise<void>;
  /** Clears the session from SecureStore and resets state. */
  logout: () => Promise<void>;
};

export function useDriverAuth(): DriverAuthState & DriverAuthActions {
  const [state, setState] = useState<DriverAuthState>({
    isLoading: true, // start loading so the UI can show a splash/spinner
    isAuthenticated: false,
    driverId: null,
    vehicleId: null,
    error: null,
    isLocked: false,
    attemptsRemaining: 5,
  });

  // ── Session restore on app launch ────────────────────────────────────────────
  useEffect(() => {
    restoreDriverSession()
      .then((session) => {
        if (session) {
          setState({
            isLoading: false,
            isAuthenticated: true,
            driverId: session.driverId,
            vehicleId: session.vehicleId,
            error: null,
            isLocked: false,
            attemptsRemaining: 5,
          });
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      })
      .catch(() => {
        setState((prev) => ({ ...prev, isLoading: false }));
      });
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────────
  const login = useCallback(async (vehicleId: string, pin: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await loginDriver(vehicleId, pin);

      if (result.success) {
        setState({
          isLoading: false,
          isAuthenticated: true,
          driverId: result.driverId,
          vehicleId: result.vehicleId,
          error: null,
          isLocked: false,
          attemptsRemaining: 5,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false,
          error: result.error,
          isLocked: result.locked ?? false,
          attemptsRemaining:
            typeof result.attemptsRemaining === "number"
              ? result.attemptsRemaining
              : Math.max(0, prev.attemptsRemaining - 1),
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
        error: (error as Error).message || "Login failed. Please try again.",
      }));
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await logoutDriver();
    setState({
      isLoading: false,
      isAuthenticated: false,
      driverId: null,
      vehicleId: null,
      error: null,
      isLocked: false,
      attemptsRemaining: 5,
    });
  }, []);

  return { ...state, login, logout };
}
