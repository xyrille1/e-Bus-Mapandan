import { useEffect, useMemo, useRef, useState } from "react";

import { fetchDeltaSince, formatBytes } from "./deltaSync";
import {
  fetchCurrentBusPositions,
  subscribeToBusPositions,
  subscribeToTripCompletions,
} from "../../../shared/supabase/busPositions";
import { supabase } from "../../../shared/supabase/client";
import {
  alertRadiusOptions,
  formatRadius,
  getDistanceMeters,
} from "./proximityAlert";

import {
  BusStopEtaRow,
  BusSnapshot,
  filterStations,
  getBusStopEtaRows,
  getCachedStations,
  getDeadReckonedBus,
  getInitialBusSnapshot,
  getStationEtaRows,
  getStationSnapshot,
  routePolyline,
} from "./liveTrackingMock";

import type {
  EtaFallbackMode,
  StationEtaRow,
  StationSnapshot,
} from "./liveTrackingMock";
import type { AlertRadiusMeters } from "./proximityAlert";

type LiveTrackingState = {
  isLoading: boolean;
  errorMessage: string | null;
  syncStatus: "idle" | "syncing" | "synced" | "failed";
  syncMessage: string | null;
  lastDeltaSyncAt: string | null;
  deltaUsageLabel: string | null;
  pendingDeltaSync: boolean;
  offlineMinutesBeforeReconnect: number;
  bus: BusSnapshot;
  lastLiveBus: BusSnapshot;
  routeName: string;
  routePolylineData: Array<{ latitude: number; longitude: number }>;
  searchQuery: string;
  cachedStations: StationSnapshot[];
  selectedStation: StationSnapshot;
  lastEtaJson: string | null;
  isBusDetailVisible: boolean;
  notificationsEnabled: boolean;
  notificationLeadMinutes: 5 | 10 | 15;
  notificationChannel: "Push" | "SMS" | "Push+SMS";
  quietHoursEnabled: boolean;
  isFeedbackVisible: boolean;
  feedbackCategory: "Crowding" | "Delay" | "Driver Conduct" | "Suggestion";
  feedbackMessage: string;
  feedbackStatus: "idle" | "sending" | "sent" | "failed";
  feedbackBanner: string | null;
  feedbackTripId: string | null;
  authStatus: "guest" | "signed-in";
  profileName: string;
  savedRoutes: number;
  alertArmed: boolean;
  alertRadiusMeters: AlertRadiusMeters;
  alertStatus: "idle" | "armed" | "triggered";
  alertMessage: string | null;
  fallbackMode: EtaFallbackMode;
  offlineMinutes: number;
};

export function useLiveBusTracking() {
  const [state, setState] = useState<LiveTrackingState>({
    isLoading: true,
    errorMessage: null,
    syncStatus: "idle",
    syncMessage: null,
    lastDeltaSyncAt: null,
    deltaUsageLabel: null,
    pendingDeltaSync: false,
    offlineMinutesBeforeReconnect: 0,
    bus: getInitialBusSnapshot(),
    lastLiveBus: getInitialBusSnapshot(),
    routeName: "Manaoag to Dagupan",
    routePolylineData: routePolyline,
    searchQuery: "",
    cachedStations: getCachedStations(),
    selectedStation: getStationSnapshot(),
    lastEtaJson: null,
    isBusDetailVisible: false,
    notificationsEnabled: true,
    notificationLeadMinutes: 10,
    notificationChannel: "Push",
    quietHoursEnabled: false,
    isFeedbackVisible: false,
    feedbackCategory: "Delay",
    feedbackMessage: "",
    feedbackStatus: "idle",
    feedbackBanner: null,
    feedbackTripId: null,
    authStatus: "guest",
    profileName: "Guest Rider",
    savedRoutes: 0,
    alertArmed: false,
    alertRadiusMeters: 500,
    alertStatus: "idle",
    alertMessage: null,
    fallbackMode: "live",
    offlineMinutes: 0,
  });

  // Wall-clock ref: updated on every real GPS ping received from Supabase Realtime.
  // Used by the stale-detection interval to decide when to degrade to dead-reckoning.
  const lastPingAtRef = useRef<Date | null>(null);
  const staleCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!supabase || !state.lastLiveBus.routeId) {
      return;
    }

    const client = supabase;

    let isMounted = true;

    const loadRouteStations = async () => {
      const { data, error } = await client
        .from("route_stations")
        .select("id, station_name, lat, lng, sequence_order")
        .eq("route_id", state.lastLiveBus.routeId)
        .order("sequence_order", { ascending: true });

      if (!isMounted || error || !data || data.length === 0) {
        return;
      }

      type Row = {
        id: string;
        station_name: string;
        lat: number;
        lng: number;
        sequence_order: number;
      };

      const stations = (data as Row[]).map((row) => ({
        id: row.id,
        name: row.station_name,
        latitude: row.lat,
        longitude: row.lng,
      }));

      const polyline = stations.map((station) => ({
        latitude: station.latitude,
        longitude: station.longitude,
      }));

      setState((previousState) => ({
        ...previousState,
        cachedStations: stations,
        routePolylineData:
          polyline.length >= 2 ? polyline : previousState.routePolylineData,
        routeName:
          previousState.lastLiveBus.routeName ?? previousState.routeName,
        selectedStation:
          stations.find(
            (station) => station.id === previousState.selectedStation.id,
          ) ?? stations[0],
      }));
    };

    loadRouteStations();

    return () => {
      isMounted = false;
    };
  }, [state.lastLiveBus.routeId, state.lastLiveBus.routeName]);

  useEffect(() => {
    const unsub = subscribeToTripCompletions((trip) => {
      setState((previousState) => {
        if (trip.vehicleId !== previousState.bus.id) {
          return previousState;
        }
        return {
          ...previousState,
          isFeedbackVisible: true,
          feedbackTripId: trip.id,
          feedbackStatus: "idle",
          feedbackBanner: "Trip completed. Share a quick feedback report.",
        };
      });
    });

    return () => {
      unsub();
    };
  }, []);

  // Type used in both ETA-derived memos below
  type RealtimeEta = {
    station_id: string;
    station_name: string;
    eta_mins: number;
  };

  // ── Bootstrap: initial fetch + Realtime subscription + stale degradation ──────
  useEffect(() => {
    let isMounted = true;
    let unsub: (() => void) | undefined;

    const init = async () => {
      // Pre-populate map with any currently-active bus positions
      const positions = await fetchCurrentBusPositions();
      if (!isMounted) return;

      if (positions.length > 0) {
        const latest = positions[0];
        lastPingAtRef.current = new Date();
        setState((prev) => ({
          ...prev,
          isLoading: false,
          bus: latest,
          lastLiveBus: latest,
          lastEtaJson: latest.etaJson ?? null,
          fallbackMode: "live",
          offlineMinutes: 0,
          errorMessage: null,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }

      // Subscribe: every GPS ping → recalculate-eta upserts bus_positions → Realtime fires here
      unsub = subscribeToBusPositions((bus) => {
        if (!isMounted) return;

        // Detect offline→online recovery before advancing the clock ref
        const wasOffline =
          lastPingAtRef.current !== null &&
          Date.now() - lastPingAtRef.current.getTime() > 30_000;
        lastPingAtRef.current = new Date();

        setState((prev) => ({
          ...prev,
          isLoading: false,
          errorMessage: null,
          fallbackMode: "live",
          offlineMinutes: 0,
          bus,
          lastLiveBus: bus,
          lastEtaJson: bus.etaJson ?? prev.lastEtaJson,
          // Trigger delta sync only when recovering from a GPS gap
          syncStatus: wasOffline ? "syncing" : prev.syncStatus,
          syncMessage: wasOffline
            ? "Syncing route changes..."
            : prev.syncMessage,
          pendingDeltaSync: wasOffline,
          offlineMinutesBeforeReconnect: wasOffline
            ? prev.offlineMinutes
            : prev.offlineMinutesBeforeReconnect,
        }));
      });
    };

    init();

    // Poll every 10 s — degrade gracefully when the GPS stream goes quiet
    staleCheckRef.current = setInterval(() => {
      if (!lastPingAtRef.current) return;
      const secsSince = (Date.now() - lastPingAtRef.current.getTime()) / 1000;
      if (secsSince <= 30) return; // stream is fresh

      setState((prev) => {
        const offlineMinutes = Math.max(1, Math.floor(secsSince / 60));
        const newMode: EtaFallbackMode =
          secsSince >= 300 ? "schedule" : "dead-reckoning";
        if (
          prev.fallbackMode === newMode &&
          prev.offlineMinutes === offlineMinutes
        )
          return prev;

        const fallbackBus: BusSnapshot =
          newMode === "dead-reckoning"
            ? getDeadReckonedBus(prev.lastLiveBus, offlineMinutes)
            : {
                ...prev.lastLiveBus,
                status: "Offline" as const,
                speedKph: 0,
                updatedAt: new Date().toISOString(),
              };

        return {
          ...prev,
          fallbackMode: newMode,
          offlineMinutes,
          errorMessage: "Estimated - Live data unavailable",
          bus: fallbackBus,
        };
      });
    }, 10_000);

    return () => {
      isMounted = false;
      unsub?.();
      if (staleCheckRef.current) clearInterval(staleCheckRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state.pendingDeltaSync) {
      return;
    }

    let isMounted = true;

    const syncDelta = async () => {
      try {
        const previousCursor =
          state.lastDeltaSyncAt ?? state.lastLiveBus.updatedAt;
        const deltaResult = await fetchDeltaSince(
          previousCursor,
          state.lastLiveBus.tripId,
          state.lastLiveBus.routeId,
        );

        if (!isMounted) {
          return;
        }

        const changeCount =
          deltaResult.changedEtaRows + deltaResult.changedStations;

        setState((previousState: LiveTrackingState) => ({
          ...previousState,
          pendingDeltaSync: false,
          syncStatus: "synced",
          syncMessage: `${changeCount} updates applied`,
          lastDeltaSyncAt: deltaResult.newCursor,
          deltaUsageLabel: formatBytes(deltaResult.downloadBytes),
        }));
      } catch (_error) {
        if (!isMounted) {
          return;
        }

        setState((previousState: LiveTrackingState) => ({
          ...previousState,
          pendingDeltaSync: false,
          syncStatus: "failed",
          syncMessage: "Delta sync failed. Using cached data.",
        }));
      }
    };

    syncDelta();

    return () => {
      isMounted = false;
    };
  }, [
    state.lastDeltaSyncAt,
    state.lastLiveBus.updatedAt,
    state.offlineMinutesBeforeReconnect,
    state.pendingDeltaSync,
  ]);

  const statusTone = useMemo(() => {
    if (state.bus.status === "Offline") {
      return "offline" as const;
    }

    if (state.bus.status === "Delayed") {
      return "syncing" as const;
    }

    return "online" as const;
  }, [state.bus.status]);

  const initialRegion = useMemo(
    () => ({
      latitude: state.routePolylineData[0].latitude,
      longitude: state.routePolylineData[0].longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }),
    [state.routePolylineData],
  );

  const filteredStations = useMemo(
    () => filterStations(state.cachedStations, state.searchQuery),
    [state.cachedStations, state.searchQuery],
  );

  const routeProgressPercent = useMemo(() => {
    const { latitude, longitude } = state.bus;
    let minDist = Infinity;
    let nearestIdx = 0;
    state.routePolylineData.forEach((pt, i) => {
      const d =
        Math.abs(pt.latitude - latitude) + Math.abs(pt.longitude - longitude);
      if (d < minDist) {
        minDist = d;
        nearestIdx = i;
      }
    });
    const total = state.routePolylineData.length - 1;
    return total > 0 ? Math.round((nearestIdx / total) * 100) : 0;
  }, [state.bus.latitude, state.bus.longitude, state.routePolylineData]);

  const busStopEtaRows = useMemo<BusStopEtaRow[]>(() => {
    if (state.lastEtaJson) {
      try {
        type EEntry = {
          station_id: string;
          station_name: string;
          eta_mins: number;
        };
        const entries: EEntry[] = JSON.parse(state.lastEtaJson);
        const penalty =
          state.fallbackMode === "dead-reckoning" ? state.offlineMinutes : 0;
        const statusLabel: BusStopEtaRow["statusLabel"] =
          state.fallbackMode === "live"
            ? "LIVE"
            : state.fallbackMode === "dead-reckoning"
              ? "ESTIMATED"
              : "SCHEDULE";
        return entries.map((e) => ({
          stationId: e.station_id,
          stationName: e.station_name,
          etaMinutes: Math.max(1, e.eta_mins + penalty),
          statusLabel,
        }));
      } catch {
        // malformed eta_json — fall through to mock
      }
    }
    return getBusStopEtaRows(0, state.fallbackMode, state.offlineMinutes);
  }, [state.lastEtaJson, state.fallbackMode, state.offlineMinutes]);

  // Derive per-station ETA rows for the selected-station panel from live eta_json
  const etaRows = useMemo<StationEtaRow[]>(() => {
    if (state.lastEtaJson && state.fallbackMode !== "schedule") {
      try {
        type RealtimeEta = {
          station_id: string;
          station_name: string;
          eta_mins: number;
        };
        const entries: RealtimeEta[] = JSON.parse(state.lastEtaJson);
        const penalty =
          state.fallbackMode === "dead-reckoning" ? state.offlineMinutes : 0;
        const selName = state.selectedStation.name.toLowerCase();
        const match = entries.find(
          (e) =>
            e.station_name.toLowerCase().includes(selName) ||
            selName.includes(e.station_name.toLowerCase()),
        );
        if (match) {
          return [
            {
              busId: state.bus.id,
              routeLabel: state.routeName,
              etaMinutes: Math.max(1, match.eta_mins + penalty),
              statusLabel: state.fallbackMode === "live" ? "LIVE" : "ESTIMATED",
              ...(state.fallbackMode === "dead-reckoning" && {
                fallbackNote: "Projected from last GPS + speed",
              }),
            },
          ];
        }
      } catch {
        // malformed eta_json — fall through
      }
    }
    return getStationEtaRows(0, state.fallbackMode, state.offlineMinutes);
  }, [
    state.bus.id,
    state.fallbackMode,
    state.lastEtaJson,
    state.offlineMinutes,
    state.routeName,
    state.selectedStation.name,
  ]);

  const distanceToSelectedStationMeters = useMemo(
    () =>
      getDistanceMeters(
        state.bus.latitude,
        state.bus.longitude,
        state.selectedStation.latitude,
        state.selectedStation.longitude,
      ),
    [
      state.bus.latitude,
      state.bus.longitude,
      state.selectedStation.latitude,
      state.selectedStation.longitude,
    ],
  );

  const setSearchQuery = (query: string) => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      searchQuery: query,
    }));
  };

  const selectStation = (stationId: string) => {
    setState((previousState: LiveTrackingState) => {
      const selected = previousState.cachedStations.find(
        (station) => station.id === stationId,
      );
      if (!selected) {
        return previousState;
      }

      return {
        ...previousState,
        selectedStation: selected,
        searchQuery: selected.name,
      };
    });
  };

  const cycleWakeAlert = () => {
    setState((previousState: LiveTrackingState) => {
      if (!previousState.alertArmed) {
        return {
          ...previousState,
          alertArmed: true,
          alertRadiusMeters: 500,
          alertStatus: "armed",
          alertMessage: `Wake alert armed at ${formatRadius(500)}`,
        };
      }

      const currentIndex = alertRadiusOptions.findIndex(
        (radius) => radius === previousState.alertRadiusMeters,
      );
      const isLast = currentIndex === alertRadiusOptions.length - 1;

      if (isLast) {
        return {
          ...previousState,
          alertArmed: false,
          alertStatus: "idle",
          alertMessage: "Wake alert turned off",
        };
      }

      const nextRadius = alertRadiusOptions[currentIndex + 1];

      return {
        ...previousState,
        alertArmed: true,
        alertRadiusMeters: nextRadius,
        alertStatus: "armed",
        alertMessage: `Wake alert armed at ${formatRadius(nextRadius)}`,
      };
    });
  };

  const dismissWakeAlert = () => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      alertStatus: previousState.alertArmed ? "armed" : "idle",
      alertMessage: previousState.alertArmed
        ? `Wake alert armed at ${formatRadius(previousState.alertRadiusMeters)}`
        : null,
    }));
  };

  const toggleBusDetail = () => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      isBusDetailVisible: !previousState.isBusDetailVisible,
    }));
  };

  const toggleNotificationsEnabled = () => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      notificationsEnabled: !previousState.notificationsEnabled,
    }));
  };

  const cycleNotificationLeadMinutes = () => {
    setState((previousState: LiveTrackingState) => {
      const leadOptions: Array<5 | 10 | 15> = [5, 10, 15];
      const currentIndex = leadOptions.findIndex(
        (option) => option === previousState.notificationLeadMinutes,
      );
      const nextIndex = (currentIndex + 1) % leadOptions.length;

      return {
        ...previousState,
        notificationLeadMinutes: leadOptions[nextIndex],
      };
    });
  };

  const cycleNotificationChannel = () => {
    setState((previousState: LiveTrackingState) => {
      const channelOptions: Array<"Push" | "SMS" | "Push+SMS"> = [
        "Push",
        "SMS",
        "Push+SMS",
      ];
      const currentIndex = channelOptions.findIndex(
        (option) => option === previousState.notificationChannel,
      );
      const nextIndex = (currentIndex + 1) % channelOptions.length;

      return {
        ...previousState,
        notificationChannel: channelOptions[nextIndex],
      };
    });
  };

  const toggleQuietHours = () => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      quietHoursEnabled: !previousState.quietHoursEnabled,
    }));
  };

  const toggleFeedbackSheet = () => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      isFeedbackVisible: !previousState.isFeedbackVisible,
      feedbackStatus: previousState.isFeedbackVisible
        ? previousState.feedbackStatus
        : "idle",
      feedbackBanner: previousState.isFeedbackVisible
        ? previousState.feedbackBanner
        : null,
    }));
  };

  const cycleFeedbackCategory = () => {
    setState((previousState: LiveTrackingState) => {
      const categories: Array<
        "Crowding" | "Delay" | "Driver Conduct" | "Suggestion"
      > = ["Crowding", "Delay", "Driver Conduct", "Suggestion"];
      const currentIndex = categories.findIndex(
        (category) => category === previousState.feedbackCategory,
      );
      const nextIndex = (currentIndex + 1) % categories.length;

      return {
        ...previousState,
        feedbackCategory: categories[nextIndex],
      };
    });
  };

  const setFeedbackMessage = (message: string) => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      feedbackMessage: message,
      feedbackStatus:
        previousState.feedbackStatus === "failed"
          ? "idle"
          : previousState.feedbackStatus,
      feedbackBanner:
        previousState.feedbackStatus === "failed"
          ? null
          : previousState.feedbackBanner,
    }));
  };

  const submitFeedback = async () => {
    if (state.feedbackMessage.trim().length < 6) {
      setState((previousState: LiveTrackingState) => ({
        ...previousState,
        feedbackStatus: "failed",
        feedbackBanner: "Please enter at least 6 characters before submitting.",
      }));
      return;
    }

    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      feedbackStatus: "sending",
      feedbackBanner: "Sending feedback...",
    }));

    if (!supabase || !state.feedbackTripId) {
      setState((previousState: LiveTrackingState) => ({
        ...previousState,
        feedbackStatus: "failed",
        feedbackBanner:
          "Feedback unavailable without an active completed trip.",
      }));
      return;
    }

    const { error } = await supabase.from("commuter_feedback").insert({
      trip_id: state.feedbackTripId,
      bus_id: state.bus.id,
      category: state.feedbackCategory,
      message: state.feedbackMessage.trim(),
    });

    if (error) {
      setState((previousState: LiveTrackingState) => ({
        ...previousState,
        feedbackStatus: "failed",
        feedbackBanner: `Feedback submit failed: ${error.message}`,
      }));
      return;
    }

    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      feedbackStatus: "sent",
      feedbackMessage: "",
      feedbackBanner: `${previousState.feedbackCategory} report submitted at ${new Date().toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      )}`,
    }));
  };

  const signInCommuter = () => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      authStatus: "signed-in",
      profileName: "Paul J.",
      savedRoutes: 3,
    }));
  };

  const useGuestMode = () => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      authStatus: "guest",
      profileName: "Guest Rider",
      savedRoutes: 0,
    }));
  };

  useEffect(() => {
    if (!state.alertArmed || state.alertStatus === "triggered") {
      return;
    }

    if (distanceToSelectedStationMeters <= state.alertRadiusMeters) {
      setState((previousState: LiveTrackingState) => ({
        ...previousState,
        alertArmed: false,
        alertStatus: "triggered",
        alertMessage: previousState.notificationsEnabled
          ? `${previousState.bus.id} is now within ${formatRadius(previousState.alertRadiusMeters)} of ${previousState.selectedStation.name}. Sent via ${previousState.notificationChannel}.`
          : `${previousState.bus.id} reached ${previousState.selectedStation.name}, but notifications are muted.`,
      }));
    }
  }, [
    distanceToSelectedStationMeters,
    state.alertArmed,
    state.alertRadiusMeters,
    state.alertStatus,
    state.notificationsEnabled,
    state.notificationChannel,
  ]);

  useEffect(() => {
    if (!state.alertArmed) {
      return;
    }

    if (state.bus.status === "At Terminal" || state.bus.status === "Offline") {
      setState((previousState) => ({
        ...previousState,
        alertArmed: false,
        alertStatus: "idle",
        alertMessage: `${previousState.bus.id} is no longer en route. Wake alert was cleared.`,
      }));
    }
  }, [state.alertArmed, state.bus.id, state.bus.status]);

  return {
    ...state,
    statusTone,
    routePolyline: state.routePolylineData,
    initialRegion,
    filteredStations,
    routeProgressPercent,
    busStopEtaRows,
    etaRows,
    distanceToSelectedStationMeters,
    notificationModeLabel: state.notificationsEnabled ? "On" : "Muted",
    setSearchQuery,
    selectStation,
    toggleBusDetail,
    toggleNotificationsEnabled,
    cycleNotificationLeadMinutes,
    cycleNotificationChannel,
    toggleQuietHours,
    toggleFeedbackSheet,
    cycleFeedbackCategory,
    setFeedbackMessage,
    submitFeedback,
    signInCommuter,
    useGuestMode,
    cycleWakeAlert,
    dismissWakeAlert,
    alertRadiusLabel: formatRadius(state.alertRadiusMeters),
    notificationLeadMinutes: state.notificationLeadMinutes,
    notificationChannel: state.notificationChannel,
    quietHoursEnabled: state.quietHoursEnabled,
    isFeedbackVisible: state.isFeedbackVisible,
    feedbackCategory: state.feedbackCategory,
    feedbackMessage: state.feedbackMessage,
    feedbackStatus: state.feedbackStatus,
    feedbackBanner: state.feedbackBanner,
    authStatus: state.authStatus,
    profileName: state.profileName,
    savedRoutes: state.savedRoutes,
  };
}
