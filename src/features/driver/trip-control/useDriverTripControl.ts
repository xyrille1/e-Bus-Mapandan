import { useEffect, useMemo, useState } from 'react';

type DriverTripPhase = 'idle' | 'running' | 'paused' | 'completed';

type DriverTripState = {
  phase: DriverTripPhase;
  busId: string;
  routeName: string;
  tripStartedAt: string | null;
  nextStation: string;
  occupancyPercent: number;
  speedKph: number;
  etaToNextStopMins: number;
  syncHealth: 'online' | 'weak' | 'offline';
  lastUpdateAt: string;
  stationStatus: 'en-route' | 'arrived';
  stationLog: Array<{
    station: string;
    action: 'ARRIVED' | 'DEPARTED';
    at: string;
  }>;
  isIncidentPanelVisible: boolean;
  incidentType: 'Traffic' | 'Breakdown' | 'Medical' | 'Security';
  incidentNote: string;
  incidentStatus: 'idle' | 'sending' | 'sent' | 'failed';
  incidentBanner: string | null;
  incidentCount: number;
  completedTrips: Array<{
    id: string;
    startedAt: string;
    endedAt: string;
    durationMins: number;
    stationEvents: number;
    incidentsReported: number;
  }>;
};

const TICK_MS = 5000;
const routeStations = [
  'Manaoag Public Terminal',
  'Binalonan Stop',
  'Urdaneta Junction',
  'Sta. Barbara Stop',
  'Calasiao Bus Stop',
  'Dagupan City Bus Terminal'
] as const;

export function useDriverTripControl() {
  const [stationIndex, setStationIndex] = useState<number>(0);
  const [state, setState] = useState<DriverTripState>({
    phase: 'idle',
    busId: 'BUS-102',
    routeName: 'Manaoag to Dagupan',
    tripStartedAt: null,
    nextStation: routeStations[0],
    occupancyPercent: 32,
    speedKph: 0,
    etaToNextStopMins: 0,
    syncHealth: 'online',
    lastUpdateAt: new Date().toISOString(),
    stationStatus: 'en-route',
    stationLog: [],
    isIncidentPanelVisible: false,
    incidentType: 'Traffic',
    incidentNote: '',
    incidentStatus: 'idle',
    incidentBanner: null,
    incidentCount: 0,
    completedTrips: []
  });

  useEffect(() => {
    if (state.phase !== 'running') {
      return;
    }

    const timer = setInterval(() => {
      setStationIndex((prev) => (prev + 1) % routeStations.length);
      setState((prev) => {
        const nextOccupancy = Math.min(98, Math.max(18, prev.occupancyPercent + (Math.random() > 0.5 ? 6 : -4)));
        const nextSpeed = Math.min(48, Math.max(16, prev.speedKph + (Math.random() > 0.5 ? 4 : -3)));
        const nextSync = prev.syncHealth === 'online' && Math.random() < 0.15 ? 'weak' : 'online';

        return {
          ...prev,
          occupancyPercent: nextOccupancy,
          speedKph: nextSpeed,
          etaToNextStopMins: Math.max(1, Math.round(2 + (50 - nextSpeed) / 10)),
          syncHealth: nextSync,
          stationStatus: 'en-route',
          lastUpdateAt: new Date().toISOString()
        };
      });
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [state.phase]);

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      nextStation: routeStations[stationIndex]
    }));
  }, [stationIndex]);

  const startTrip = () => {
    setStationIndex(0);
    setState((prev) => ({
      ...prev,
      phase: 'running',
      tripStartedAt: new Date().toISOString(),
      speedKph: 28,
      etaToNextStopMins: 4,
      syncHealth: 'online',
      stationStatus: 'en-route',
      lastUpdateAt: new Date().toISOString(),
      stationLog: [],
      incidentCount: 0
    }));
  };

  const pauseTrip = () => {
    setState((prev) => ({
      ...prev,
      phase: 'paused',
      speedKph: 0,
      etaToNextStopMins: prev.etaToNextStopMins,
      syncHealth: 'weak',
      lastUpdateAt: new Date().toISOString()
    }));
  };

  const resumeTrip = () => {
    setState((prev) => ({
      ...prev,
      phase: 'running',
      speedKph: 24,
      syncHealth: 'online',
      stationStatus: 'en-route',
      lastUpdateAt: new Date().toISOString()
    }));
  };

  const endTrip = () => {
    setState((prev) => {
      const endedAt = new Date().toISOString();
      const startedAt = prev.tripStartedAt ?? endedAt;
      const durationMins = Math.max(
        1,
        Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)
      );

      return {
        ...prev,
        phase: 'completed',
        tripStartedAt: null,
        speedKph: 0,
        etaToNextStopMins: 0,
        syncHealth: 'offline',
        stationStatus: 'arrived',
        lastUpdateAt: endedAt,
        completedTrips: [
          {
            id: `TRIP-${Date.now()}`,
            startedAt,
            endedAt,
            durationMins,
            stationEvents: prev.stationLog.length,
            incidentsReported: prev.incidentCount
          },
          ...prev.completedTrips
        ].slice(0, 5)
      };
    });
  };

  const markArrivedAtStop = () => {
    setState((prev) => {
      if (prev.phase !== 'running') {
        return prev;
      }

      return {
        ...prev,
        speedKph: 0,
        etaToNextStopMins: 0,
        stationStatus: 'arrived',
        lastUpdateAt: new Date().toISOString(),
        stationLog: [
          {
            station: prev.nextStation,
            action: 'ARRIVED' as const,
            at: new Date().toISOString()
          },
          ...prev.stationLog
        ].slice(0, 4)
      };
    });
  };

  const markDepartedFromStop = () => {
    setState((prev) => {
      if (prev.phase === 'idle' || prev.phase === 'completed') {
        return prev;
      }

      return {
        ...prev,
        phase: 'running',
        speedKph: 22,
        etaToNextStopMins: 4,
        stationStatus: 'en-route',
        lastUpdateAt: new Date().toISOString(),
        stationLog: [
          {
            station: prev.nextStation,
            action: 'DEPARTED' as const,
            at: new Date().toISOString()
          },
          ...prev.stationLog
        ].slice(0, 4)
      };
    });

    setStationIndex((prev) => (prev + 1) % routeStations.length);
  };

  const toggleIncidentPanel = () => {
    setState((prev) => ({
      ...prev,
      isIncidentPanelVisible: !prev.isIncidentPanelVisible,
      incidentStatus: prev.isIncidentPanelVisible ? prev.incidentStatus : 'idle',
      incidentBanner: prev.isIncidentPanelVisible ? prev.incidentBanner : null
    }));
  };

  const cycleIncidentType = () => {
    setState((prev) => {
      const types: Array<'Traffic' | 'Breakdown' | 'Medical' | 'Security'> = [
        'Traffic',
        'Breakdown',
        'Medical',
        'Security'
      ];
      const currentIndex = types.findIndex((type) => type === prev.incidentType);
      const nextIndex = (currentIndex + 1) % types.length;

      return {
        ...prev,
        incidentType: types[nextIndex]
      };
    });
  };

  const setIncidentNote = (note: string) => {
    setState((prev) => ({
      ...prev,
      incidentNote: note,
      incidentStatus: prev.incidentStatus === 'failed' ? 'idle' : prev.incidentStatus,
      incidentBanner: prev.incidentStatus === 'failed' ? null : prev.incidentBanner
    }));
  };

  const submitIncident = async () => {
    if (state.incidentNote.trim().length < 8) {
      setState((prev) => ({
        ...prev,
        incidentStatus: 'failed',
        incidentBanner: 'Please provide at least 8 characters in the incident note.'
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      incidentStatus: 'sending',
      incidentBanner: 'Sending incident report to dispatch...'
    }));

    await new Promise((resolve) => setTimeout(resolve, 700));

    setState((prev) => ({
      ...prev,
      incidentStatus: 'sent',
      incidentCount: prev.incidentCount + 1,
      incidentNote: '',
      incidentBanner: `${prev.incidentType} incident reported at ${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })}`
    }));
  };

  const healthTone = useMemo(() => {
    if (state.syncHealth === 'offline') {
      return '#f97316';
    }

    if (state.syncHealth === 'weak') {
      return '#facc15';
    }

    return '#10d6b4';
  }, [state.syncHealth]);

  return {
    ...state,
    healthTone,
    startTrip,
    pauseTrip,
    resumeTrip,
    endTrip,
    markArrivedAtStop,
    markDepartedFromStop,
    toggleIncidentPanel,
    cycleIncidentType,
    setIncidentNote,
    submitIncident
  };
}
