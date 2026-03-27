/**
 * usePreShiftChecklist.ts — Feature #8
 *
 * Manages the three-item pre-shift gate:
 *   (1) Vehicle ID confirmed (read from driver session)
 *   (2) Route confirmed (passed from Route Selection)
 *   (3) GPS signal acquired (real coordinate from expo-location)
 *
 * The Confirm button is disabled until all three are satisfied.
 * GPS weakness shows a warning message; confirms are blocked until
 * the device returns a valid coordinate.
 *
 * When all three are confirmed:
 *   - Calls onConfirm() which triggers the GPS broadcast (Feature #2)
 */

import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type GpsSignalStrength = "unknown" | "weak" | "good";

export type PreShiftChecklistState = {
  vehicleIdConfirmed: boolean;
  routeConfirmed: boolean;
  gpsSignalStrength: GpsSignalStrength;
  gpsCoords: { lat: number; lng: number } | null;
  canConfirm: boolean;
  isCheckingGps: boolean;
};

type PreShiftChecklistActions = {
  confirmVehicleId: () => void;
  confirmRoute: () => void;
  /** Re-polls GPS. Called automatically on mount; exposable for a "Retry GPS" button. */
  refreshGpsSignal: () => Promise<void>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * GPS is considered "good" if the device returns a coordinate with
 * horizontal accuracy ≤ 30 m (roughly equivalent to a 3-bar GPS signal).
 * Below that threshold it's "weak" — Confirm is disabled with a warning.
 */
function classifyAccuracy(accuracyM: number | null): GpsSignalStrength {
  if (accuracyM === null) return "unknown";
  return accuracyM <= 30 ? "good" : "weak";
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePreShiftChecklist(opts: {
  vehicleId: string | null;
  routeName: string | null;
}): PreShiftChecklistState & PreShiftChecklistActions {
  const { vehicleId, routeName } = opts;

  const [vehicleIdConfirmed, setVehicleIdConfirmed] = useState(false);
  const [routeConfirmed, setRouteConfirmed] = useState(false);
  const [gpsSignalStrength, setGpsSignalStrength] =
    useState<GpsSignalStrength>("unknown");
  const [gpsCoords, setGpsCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isCheckingGps, setIsCheckingGps] = useState(false);

  // Auto-confirm vehicle and route when values are set from the parent
  useEffect(() => {
    if (vehicleId) setVehicleIdConfirmed(false); // reset so driver explicitly confirms
  }, [vehicleId]);

  useEffect(() => {
    if (routeName) setRouteConfirmed(false);
  }, [routeName]);

  const refreshGpsSignal = useCallback(async () => {
    setIsCheckingGps(true);
    setGpsSignalStrength("unknown");
    setGpsCoords(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsSignalStrength("weak");
        setIsCheckingGps(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setGpsCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setGpsSignalStrength(classifyAccuracy(loc.coords.accuracy));
    } catch {
      setGpsSignalStrength("weak");
    } finally {
      setIsCheckingGps(false);
    }
  }, []);

  // Poll GPS on mount
  useEffect(() => {
    refreshGpsSignal();
  }, [refreshGpsSignal]);

  const confirmVehicleId = useCallback(() => {
    setVehicleIdConfirmed(true);
  }, []);

  const confirmRoute = useCallback(() => {
    setRouteConfirmed(true);
  }, []);

  const canConfirm =
    vehicleIdConfirmed &&
    routeConfirmed &&
    gpsSignalStrength === "good" &&
    !isCheckingGps;

  return {
    vehicleIdConfirmed,
    routeConfirmed,
    gpsSignalStrength,
    gpsCoords,
    canConfirm,
    isCheckingGps,
    confirmVehicleId,
    confirmRoute,
    refreshGpsSignal,
  };
}
