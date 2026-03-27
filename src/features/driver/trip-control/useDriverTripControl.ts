/**
 * useDriverTripControl.ts
 *
 * Feature hub for the active shift screen. Connects all real driver-shift hooks:
 *   - GPS broadcast lifecycle  (Feature #2 / #3 / #10)
 *   - Shift end + trip finalisation  (Feature #5)
 *   - Geofence-triggered end prompt   (Feature #7)
 *
 * Station log, occupancy display, and incident panel are local UI state.
 * The PRD does not require server-side station check-ins from the driver app.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDriverClient } from "../auth/driverSession";
import { type GpsMode } from "../gps-broadcast/useBatterySavingGps";
import { useGpsBroadcast } from "../gps-broadcast/useGpsBroadcast";
import { useGeofenceShiftEnd, type GeofencePrompt } from "../shift-end/useGeofenceShiftEnd";
import { useShiftEnd, type ShiftSummary } from "../shift-end/useShiftEnd";

// ── Local types ───────────────────────────────────────────────────────────────

type IncidentType = "Traffic" | "Breakdown" | "Medical" | "Security";
type DriverTripPhase = "idle" | "running" | "paused" | "completed";

const INCIDENT_TYPES: IncidentType[] = ["Traffic", "Breakdown", "Medical", "Security"];

const ROUTE_STATIONS = [
  "Manaoag Public Terminal",
  "Binalonan Stop",
  "Urdaneta Junction",
  "Sta. Barbara Stop",
  "Calasiao Bus Stop",
  "Dagupan City Bus Terminal",
] as const;

type StationLogEntry = { station: string; action: "ARRIVED" | "DEPARTED"; at: string };

type CompletedTrip = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationMins: number;
  distanceKm: number;
};

type RouteStationRow = {
  station_name: string;
  sequence_order: number;
};

type BusPositionRealtimeRow = {
  id: string;
  updated_at: string;
  eta_json?: string | null;
};

type EtaRow = {
  station_name?: string;
  eta_mins?: number;
};

const TICK_MS = parseInt(process.env.EXPO_PUBLIC_LIVE_TICK_MS ?? "5000", 10);

// ── Exported types ────────────────────────────────────────────────────────────

export type DriverTripControlState = {
  busId: string;
  routeName: string;
  broadcastStatus: "idle" | "starting" | "active" | "stopping";
  phase: DriverTripPhase;
  tripId: string | null;
  speedKph: number;
  elapsedTime: string;
  isBatterySaving: boolean;
  gpsMode: GpsMode;
  syncHealth: "online" | "weak" | "offline";
  healthTone: string;
  lastUpdateAt: string;
  nextStation: string;
  occupancyPercent: number;
  etaToNextStopMins: number;
  stationStatus: "en-route" | "arrived";
  stationLog: StationLogEntry[];
  isIncidentPanelVisible: boolean;
  incidentType: IncidentType;
  incidentNote: string;
  incidentStatus: "idle" | "sending" | "sent" | "failed";
  incidentBanner: string | null;
  completedTrips: CompletedTrip[];
  shiftEndPhase: "idle" | "flushing" | "reviewing" | "submitting" | "done" | "error";
  shiftSummary: ShiftSummary | null;
  shiftEndError: string | null;
  geofencePrompt: GeofencePrompt | null;
  broadcastError: string | null;
};

type DriverTripControlActions = {
  startTrip: () => Promise<void>;
  pauseTrip: () => void;
  resumeTrip: () => void;
  endTrip: () => Promise<void>;
  submitShiftEnd: () => Promise<void>;
  cancelShiftEnd: () => void;
  confirmGeofenceEnd: () => Promise<void>;
  dismissGeofencePrompt: () => void;
  markArrivedAtStop: () => void;
  markDepartedFromStop: () => void;
  toggleIncidentPanel: () => void;
  cycleIncidentType: () => void;
  setIncidentNote: (note: string) => void;
  submitIncident: () => Promise<void>;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useDriverTripControl(opts: {
  vehicleId: string;
  routeId: string;
  routeName: string;
  driverId: string;
  onShiftCompleted: () => void;
}): DriverTripControlState & DriverTripControlActions {
  const { vehicleId, routeId, routeName, driverId, onShiftCompleted } = opts;

  const broadcast = useGpsBroadcast();
  const shiftEnd = useShiftEnd();
  const geofence = useGeofenceShiftEnd();

  const [isPaused, setIsPaused] = useState(false);
  const [stationIndex, setStationIndex] = useState(0);
  const [routeStations, setRouteStations] = useState<string[]>([...ROUTE_STATIONS]);
  const [liveLastUpdateAt, setLiveLastUpdateAt] = useState<string | null>(null);
  const [liveEtaToNextStopMins, setLiveEtaToNextStopMins] = useState<number | null>(null);
  const [liveNextStation, setLiveNextStation] = useState<string | null>(null);
  const [occupancyPercent] = useState(32);
  const [stationStatus, setStationStatus] = useState<"en-route" | "arrived">("en-route");
  const [stationLog, setStationLog] = useState<StationLogEntry[]>([]);
  const [isIncidentPanelVisible, setIsIncidentPanelVisible] = useState(false);
  const [incidentType, setIncidentType] = useState<IncidentType>("Traffic");
  const [incidentNote, setIncidentNote] = useState("");
  const [incidentStatus, setIncidentStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [incidentBanner, setIncidentBanner] = useState<string | null>(null);
  const [completedTrips, setCompletedTrips] = useState<CompletedTrip[]>([]);
  const [elapsedTime, setElapsedTime] = useState("0m");
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (broadcast.status !== "active" || !broadcast.tripStartedAt) {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      setElapsedTime("0m");
      return;
    }
    const startedAt = broadcast.tripStartedAt;
    const tick = () => {
      const mins = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000));
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      setElapsedTime(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    elapsedTimerRef.current = setInterval(tick, TICK_MS);
    return () => { if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current); };
  }, [broadcast.status, broadcast.tripStartedAt]);

  useEffect(() => {
    if (driverId) geofence.registerPushToken(driverId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  useEffect(() => {
    const client = getDriverClient();
    if (!client || !routeId) return;

    let isMounted = true;
    const loadStations = async () => {
      const { data, error } = await client
        .from("route_stations")
        .select("station_name, sequence_order")
        .eq("route_id", routeId)
        .order("sequence_order", { ascending: true });

      if (!isMounted || error || !data?.length) return;

      const stationNames = (data as RouteStationRow[]).map((row) => row.station_name);
      if (stationNames.length > 0) {
        setRouteStations(stationNames);
      }
    };

    void loadStations();

    return () => {
      isMounted = false;
    };
  }, [routeId]);

  useEffect(() => {
    if (stationIndex < routeStations.length) return;
    setStationIndex(0);
  }, [stationIndex, routeStations]);

  useEffect(() => {
    const client = getDriverClient();
    if (!client || !vehicleId) return;

    let isMounted = true;

    const applyRow = (row: BusPositionRealtimeRow) => {
      if (!isMounted) return;

      setLiveLastUpdateAt(row.updated_at ?? null);

      if (!row.eta_json) {
        setLiveEtaToNextStopMins(null);
        setLiveNextStation(null);
        return;
      }

      try {
        const parsed = JSON.parse(row.eta_json) as EtaRow[];
        const next = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
        setLiveEtaToNextStopMins(typeof next?.eta_mins === "number" ? Math.max(0, Math.round(next.eta_mins)) : null);
        setLiveNextStation(typeof next?.station_name === "string" ? next.station_name : null);
      } catch {
        setLiveEtaToNextStopMins(null);
        setLiveNextStation(null);
      }
    };

    const loadInitial = async () => {
      const { data } = await client
        .from("bus_positions")
        .select("id, updated_at, eta_json")
        .eq("id", vehicleId)
        .maybeSingle();
      if (data) applyRow(data as BusPositionRealtimeRow);
    };

    void loadInitial();

    const channel = client
      .channel(`driver-bus-position-${vehicleId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bus_positions", filter: `id=eq.${vehicleId}` },
        (payload) => applyRow(payload.new as BusPositionRealtimeRow),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bus_positions", filter: `id=eq.${vehicleId}` },
        (payload) => applyRow(payload.new as BusPositionRealtimeRow),
      )
      .subscribe();

    return () => {
      isMounted = false;
      client.removeChannel(channel);
    };
  }, [vehicleId]);

  useEffect(() => {
    if (shiftEnd.phase === "done") onShiftCompleted();
  }, [shiftEnd.phase, onShiftCompleted]);

  const phase: DriverTripPhase = useMemo(() => {
    if (broadcast.status === "active" || broadcast.status === "stopping") {
      return isPaused ? "paused" : "running";
    }
    if (shiftEnd.phase === "done") return "completed";
    return "idle";
  }, [broadcast.status, shiftEnd.phase, isPaused]);

  const syncHealth: "online" | "weak" | "offline" = useMemo(() => {
    if (broadcast.connectionStatus === "offline") return "offline";
    if (broadcast.connectionStatus === "syncing") return "weak";
    return "online";
  }, [broadcast.connectionStatus]);

  const healthTone =
    syncHealth === "online" ? "#1A6B42" : syncHealth === "offline" ? "#DC2626" : "#D97706";

  const startTrip = useCallback(async () => {
    setStationIndex(0);
    setStationStatus("en-route");
    setStationLog([]);
    setIsPaused(false);
    await broadcast.startBroadcast({ driverId, vehicleId, routeId });
  }, [broadcast, driverId, vehicleId, routeId]);

  const pauseTrip = useCallback(() => setIsPaused(true), []);
  const resumeTrip = useCallback(() => setIsPaused(false), []);

  const endTrip = useCallback(async () => {
    if (!broadcast.tripId) return;
    await shiftEnd.initiateEnd({
      tripId: broadcast.tripId,
      vehicleId,
      routeName,
      stopBroadcast: broadcast.stopBroadcast,
    });
  }, [broadcast.tripId, broadcast.stopBroadcast, shiftEnd, vehicleId, routeName]);

  const submitShiftEnd = useCallback(async () => {
    const ok = await shiftEnd.submitTrip();
    if (ok && shiftEnd.summary) {
      setCompletedTrips((prev) =>
        [
          {
            id: shiftEnd.summary!.tripId,
            startedAt: shiftEnd.summary!.startedAt,
            endedAt: shiftEnd.summary!.endedAt,
            durationMins: shiftEnd.summary!.durationMins,
            distanceKm: shiftEnd.summary!.distanceKm,
          },
          ...prev,
        ].slice(0, 5),
      );
    }
  }, [shiftEnd]);

  const cancelShiftEnd = useCallback(() => shiftEnd.cancel(), [shiftEnd]);

  const confirmGeofenceEnd = useCallback(async () => {
    geofence.dismissGeofencePrompt();
    if (!broadcast.tripId) return;
    await shiftEnd.initiateEnd({
      tripId: broadcast.tripId,
      vehicleId,
      routeName,
      stopBroadcast: broadcast.stopBroadcast,
    });
  }, [geofence, broadcast.tripId, broadcast.stopBroadcast, shiftEnd, vehicleId, routeName]);

  const dismissGeofencePrompt = useCallback(() => geofence.dismissGeofencePrompt(), [geofence]);

  const markArrivedAtStop = useCallback(() => {
    if (phase !== "running") return;
    const station = routeStations[stationIndex] ?? routeStations[0] ?? "Unknown Station";
    setStationStatus("arrived");
    setStationLog((prev) =>
      [{ station, action: "ARRIVED" as const, at: new Date().toISOString() }, ...prev].slice(0, 4),
    );
  }, [phase, routeStations, stationIndex]);

  const markDepartedFromStop = useCallback(() => {
    if (phase === "idle" || phase === "completed") return;
    const station = routeStations[stationIndex] ?? routeStations[0] ?? "Unknown Station";
    setStationStatus("en-route");
    setStationIndex((prev) => (prev + 1) % Math.max(1, routeStations.length));
    setStationLog((prev) =>
      [{ station, action: "DEPARTED" as const, at: new Date().toISOString() }, ...prev].slice(0, 4),
    );
  }, [phase, routeStations, stationIndex]);

  const toggleIncidentPanel = useCallback(() => {
    setIsIncidentPanelVisible((v) => !v);
    setIncidentStatus("idle");
    setIncidentBanner(null);
  }, []);

  const cycleIncidentType = useCallback(() => {
    setIncidentType((prev) => {
      const i = INCIDENT_TYPES.indexOf(prev);
      return INCIDENT_TYPES[(i + 1) % INCIDENT_TYPES.length];
    });
  }, []);

  const handleSetIncidentNote = useCallback(
    (note: string) => {
      setIncidentNote(note);
      if (incidentStatus === "failed") { setIncidentStatus("idle"); setIncidentBanner(null); }
    },
    [incidentStatus],
  );

  const submitIncident = useCallback(async () => {
    if (incidentNote.trim().length < 8) {
      setIncidentStatus("failed");
      setIncidentBanner("Provide at least 8 characters in the incident note.");
      return;
    }

    const client = getDriverClient();
    if (!client) {
      setIncidentStatus("failed");
      setIncidentBanner("Session expired. Please log in again.");
      return;
    }

    setIncidentStatus("sending");
    setIncidentBanner("Submitting incident report to dispatch...");

    const { error } = await client
      .from("driver_incidents")
      .insert({
        trip_id: broadcast.tripId,
        driver_id: driverId,
        vehicle_id: vehicleId,
        route_id: routeId,
        incident_type: incidentType,
        note: incidentNote.trim(),
      });

    if (error) {
      setIncidentStatus("failed");
      setIncidentBanner(`Incident submit failed: ${error.message}`);
      return;
    }

    setIncidentStatus("sent");
    setIncidentBanner(`${incidentType} incident reported.`);
    setIncidentNote("");
  }, [broadcast.tripId, driverId, incidentNote, incidentType, routeId, vehicleId]);

  return {
    busId: vehicleId,
    routeName,
    broadcastStatus: broadcast.status,
    phase,
    tripId: broadcast.tripId,
    speedKph: phase === "running" ? broadcast.speedKph : 0,
    elapsedTime,
    isBatterySaving: broadcast.isBatterySaving,
    gpsMode: broadcast.gpsMode,
    syncHealth,
    healthTone,
    lastUpdateAt: liveLastUpdateAt ?? broadcast.lastPingAt ?? new Date().toISOString(),
    nextStation: liveNextStation ?? routeStations[stationIndex] ?? routeStations[0] ?? "Unknown Station",
    occupancyPercent,
    etaToNextStopMins: liveEtaToNextStopMins ?? 0,
    stationStatus,
    stationLog,
    isIncidentPanelVisible,
    incidentType,
    incidentNote,
    incidentStatus,
    incidentBanner,
    completedTrips,
    shiftEndPhase: shiftEnd.phase,
    shiftSummary: shiftEnd.summary,
    shiftEndError: shiftEnd.error,
    geofencePrompt: geofence.geofencePrompt,
    broadcastError: broadcast.error,
    startTrip,
    pauseTrip,
    resumeTrip,
    endTrip,
    submitShiftEnd,
    cancelShiftEnd,
    confirmGeofenceEnd,
    dismissGeofencePrompt,
    markArrivedAtStop,
    markDepartedFromStop,
    toggleIncidentPanel,
    cycleIncidentType,
    setIncidentNote: handleSetIncidentNote,
    submitIncident,
  };
}
