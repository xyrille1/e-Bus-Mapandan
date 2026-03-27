/**
 * useGeofenceShiftEnd.ts — Feature #7
 *
 * Registers for Expo push notifications on mount, saves the device's
 * Expo Push Token to Supabase so the geofence-check Edge Function can
 * deliver the terminal-arrival prompt.
 *
 * When the push arrives:
 *  - `geofencePrompt` becomes the terminal name
 *  - Driver taps Confirm → caller calls `useShiftEnd.initiateEnd()`
 *  - Driver taps Dismiss → prompt cleared; shift remains active
 *
 * The hook also requests notification permissions on first use.
 */

import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { getDriverClient } from "../auth/driverSession";

// ── Configure notification handler (show banners while app is foregrounded) ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type GeofencePrompt = {
  geofenceName: string;
  geofenceId: string;
  tripId: string;
};

export type GeofenceShiftEndState = {
  /** Non-null when the driver has arrived at a terminal and should be prompted. */
  geofencePrompt: GeofencePrompt | null;
  /** True while the push token is being registered. */
  isRegisteringPush: boolean;
  /** Error from permission request or token registration. */
  pushError: string | null;
};

type GeofenceShiftEndActions = {
  /** Call after driver confirms — clears the prompt. */
  dismissGeofencePrompt: () => void;
  /** Register push token for the active driver. Call once after login. */
  registerPushToken: (driverId: string) => Promise<void>;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGeofenceShiftEnd(): GeofenceShiftEndState &
  GeofenceShiftEndActions {
  const [geofencePrompt, setGeofencePrompt] = useState<GeofencePrompt | null>(
    null,
  );
  const [isRegisteringPush, setIsRegisteringPush] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const notifSubRef = useRef<Notifications.Subscription | null>(null);

  // ── Subscribe to incoming push notifications ──────────────────────────────────
  useEffect(() => {
    notifSubRef.current = Notifications.addNotificationReceivedListener(
      (notif) => {
        const data = notif.request.content.data as
          | Record<string, unknown>
          | undefined;

        if (data?.type === "geofence_arrival") {
          setGeofencePrompt({
            geofenceName: (data.geofence_name as string) ?? "Terminal",
            geofenceId: (data.geofence_id as string) ?? "",
            tripId: (data.trip_id as string) ?? "",
          });
        }
      },
    );

    return () => {
      notifSubRef.current?.remove();
      notifSubRef.current = null;
    };
  }, []);

  // ── Register push token with Supabase ─────────────────────────────────────────
  const registerPushToken = useCallback(async (driverId: string) => {
    setIsRegisteringPush(true);
    setPushError(null);

    try {
      // Android requires a notification channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("geofence", {
          name: "Geofence Alerts",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        setPushError(
          "Push notification permission denied. Geofence prompts will not work.",
        );
        setIsRegisteringPush(false);
        return;
      }

      let expoPushToken: string;
      try {
        // In Expo Go / dev builds this works without projectId.
        // In EAS production builds the projectId is auto-detected from app.json.
        // Wrap in try-catch so a misconfigured build degrades gracefully instead of crashing.
        const tokenData = await Notifications.getExpoPushTokenAsync();
        expoPushToken = tokenData.data;
      } catch (tokenErr) {
        setPushError(
          `Push token unavailable: ${(tokenErr as Error).message}. Geofence prompts will not work.`,
        );
        setIsRegisteringPush(false);
        return;
      }

      const client = getDriverClient();
      if (client) {
        await client
          .from("drivers")
          .update({ expo_push_token: expoPushToken })
          .eq("id", driverId);
      }
    } catch (err) {
      setPushError((err as Error).message ?? "Push registration failed.");
    } finally {
      setIsRegisteringPush(false);
    }
  }, []);

  const dismissGeofencePrompt = useCallback(() => {
    setGeofencePrompt(null);
  }, []);

  return {
    geofencePrompt,
    isRegisteringPush,
    pushError,
    dismissGeofencePrompt,
    registerPushToken,
  };
}
