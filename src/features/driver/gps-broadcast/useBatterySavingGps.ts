/**
 * useBatterySavingGps.ts — Feature #10
 *
 * Monitors device battery level during an active shift.
 * When the level drops below 20 %, automatically switches the GPS
 * broadcast from high-accuracy to minimum-accuracy mode (reduced
 * polling frequency) to extend device battery life.
 *
 * The hook does NOT stop the GPS broadcast — the shift continues at
 * reduced accuracy rather than failing. When battery recovers above
 * the threshold, high-accuracy mode resumes automatically.
 *
 * GPS accuracy mode is communicated back to the caller so
 * useGpsBroadcast (or the foreground location watch) can reconfigure.
 */

import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────

const BATTERY_SAVE_THRESHOLD = 0.20; // 20%
const HIGH_ACCURACY_INTERVAL_MS   = parseInt(process.env.EXPO_PUBLIC_LIVE_TICK_MS ?? '5000', 10);
const LOW_ACCURACY_INTERVAL_MS    = HIGH_ACCURACY_INTERVAL_MS * 3; // ~15–30 s
const HIGH_ACCURACY_DISTANCE_M    = 10;
const LOW_ACCURACY_DISTANCE_M     = 30;

// ── Types ─────────────────────────────────────────────────────────────────────

export type GpsMode = 'high-accuracy' | 'battery-saving';

export type BatterySavingState = {
  gpsMode: GpsMode;
  batteryLevel: number | null;  // 0.0–1.0 or null if unavailable
  isBatterySaving: boolean;
};

type BatterySavingActions = {
  /**
   * Returns the Location options that should be used for the current GPS mode.
   * Callers pass these to watchPositionAsync / startLocationUpdatesAsync.
   */
  getLocationOptions: () => Location.LocationOptions;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useBatterySavingGps(isShiftActive: boolean): BatterySavingState & BatterySavingActions {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [gpsMode, setGpsMode] = useState<GpsMode>('high-accuracy');

  const subscriptionRef = useRef<Battery.Subscription | null>(null);

  // ── Start/stop battery monitoring with shift ──────────────────────────────────
  useEffect(() => {
    if (!isShiftActive) {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      setGpsMode('high-accuracy');
      setBatteryLevel(null);
      return;
    }

    // Read initial level
    Battery.getBatteryLevelAsync().then((level) => {
      setBatteryLevel(level);
      setGpsMode(level < BATTERY_SAVE_THRESHOLD ? 'battery-saving' : 'high-accuracy');
    });

    // Subscribe to continuous updates
    subscriptionRef.current = Battery.addBatteryLevelListener(({ batteryLevel: level }) => {
      setBatteryLevel(level);
      setGpsMode(level < BATTERY_SAVE_THRESHOLD ? 'battery-saving' : 'high-accuracy');
    });

    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [isShiftActive]);

  const getLocationOptions = useCallback((): Location.LocationOptions => {
    if (gpsMode === 'battery-saving') {
      return {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOW_ACCURACY_INTERVAL_MS,
        distanceInterval: LOW_ACCURACY_DISTANCE_M,
      };
    }
    return {
      accuracy: Location.Accuracy.High,
      timeInterval: HIGH_ACCURACY_INTERVAL_MS,
      distanceInterval: HIGH_ACCURACY_DISTANCE_M,
    };
  }, [gpsMode]);

  return {
    gpsMode,
    batteryLevel,
    isBatterySaving: gpsMode === 'battery-saving',
    getLocationOptions,
  };
}
