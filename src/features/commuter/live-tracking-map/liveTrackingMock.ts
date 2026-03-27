export type BusOperationalStatus =
  | "En Route"
  | "At Terminal"
  | "Offline"
  | "Delayed";

export type BusSnapshot = {
  id: string;
  plateNumber: string;
  status: BusOperationalStatus;
  speedKph: number;
  updatedAt: string;
  latitude: number;
  longitude: number;
  tripId?: string;
  routeId?: string;
  routeName?: string;
  /** Raw JSON array written by recalculate-eta Edge Function — [{station_id, station_name, eta_mins}] */
  etaJson?: string;
};

export type StationSnapshot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

const stationSeed: StationSnapshot[] = [
  {
    id: "ST-01",
    name: "Manaoag Public Terminal",
    latitude: 16.0434,
    longitude: 120.4866,
  },
  {
    id: "ST-02",
    name: "Binalonan Stop",
    latitude: 16.0588,
    longitude: 120.5159,
  },
  {
    id: "ST-03",
    name: "Urdaneta Junction",
    latitude: 16.0673,
    longitude: 120.5369,
  },
  {
    id: "ST-04",
    name: "Sta. Barbara Stop",
    latitude: 16.0793,
    longitude: 120.5658,
  },
  {
    id: "ST-05",
    name: "Calasiao Bus Stop",
    latitude: 15.912,
    longitude: 120.3623,
  },
  {
    id: "ST-06",
    name: "Dagupan City Bus Terminal",
    latitude: 16.0912,
    longitude: 120.5948,
  },
];

export type StationEtaRow = {
  busId: string;
  routeLabel: string;
  etaMinutes: number;
  statusLabel: "LIVE" | "ESTIMATED" | "SCHEDULE";
  fallbackNote?: string;
};

export type BusStopEtaRow = {
  stationId: string;
  stationName: string;
  etaMinutes: number;
  statusLabel: "LIVE" | "ESTIMATED" | "SCHEDULE";
};

export type EtaFallbackMode = "live" | "dead-reckoning" | "schedule";

export const routePolyline = [
  { latitude: 16.0434, longitude: 120.4866 },
  { latitude: 16.046, longitude: 120.4921 },
  { latitude: 16.0535, longitude: 120.5088 },
  { latitude: 16.0611, longitude: 120.5232 },
  { latitude: 16.0673, longitude: 120.5369 },
  { latitude: 16.0728, longitude: 120.5496 },
  { latitude: 16.0767, longitude: 120.5601 },
  { latitude: 16.0815, longitude: 120.5709 },
  { latitude: 16.0871, longitude: 120.5842 },
  { latitude: 16.0912, longitude: 120.5948 },
];

export function getInitialBusSnapshot(): BusSnapshot {
  const firstPoint = routePolyline[0];

  return {
    id: "BUS-102",
    plateNumber: "PAB-1024",
    status: "En Route",
    speedKph: 30,
    updatedAt: new Date().toISOString(),
    latitude: firstPoint.latitude,
    longitude: firstPoint.longitude,
  };
}

export function getNextBusSnapshot(step: number): BusSnapshot {
  const polylineIndex = step % routePolyline.length;
  const point = routePolyline[polylineIndex];
  const isFinalStop = polylineIndex === routePolyline.length - 1;
  const isOffline = step > 0 && step % 9 === 0;
  const isDelayed = step > 0 && step % 5 === 0 && !isOffline;

  let status: BusOperationalStatus = "En Route";
  if (isOffline) {
    status = "Offline";
  } else if (isFinalStop) {
    status = "At Terminal";
  } else if (isDelayed) {
    status = "Delayed";
  }

  return {
    id: "BUS-102",
    plateNumber: "PAB-1024",
    status,
    speedKph: isOffline || isFinalStop ? 0 : 26 + (polylineIndex % 5) * 2,
    updatedAt: new Date().toISOString(),
    latitude: point.latitude,
    longitude: point.longitude,
  };
}

export function getStationSnapshot(): StationSnapshot {
  return {
    id: "ST-05",
    name: "Calasiao Bus Stop",
    latitude: 15.912,
    longitude: 120.3623,
  };
}

export function getCachedStations(): StationSnapshot[] {
  return stationSeed;
}

export function filterStations(
  stations: StationSnapshot[],
  query: string,
): StationSnapshot[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return stations;
  }

  return stations.filter((station) =>
    station.name.toLowerCase().includes(normalizedQuery),
  );
}

export function getDeadReckonedBus(
  lastLiveBus: BusSnapshot,
  offlineMinutes: number,
): BusSnapshot {
  const drift = Math.min(offlineMinutes, 5) * 0.0008;

  return {
    ...lastLiveBus,
    status: "Offline",
    speedKph: Math.max(8, lastLiveBus.speedKph - offlineMinutes * 3),
    updatedAt: new Date().toISOString(),
    latitude: lastLiveBus.latitude + drift,
    longitude: lastLiveBus.longitude + drift * 0.78,
  };
}

export function getStationEtaRows(
  step: number,
  fallbackMode: EtaFallbackMode,
  offlineMinutes: number,
): StationEtaRow[] {
  const bus102Minutes = Math.max(1, 7 - (step % 6));
  const bus103Minutes = 13 + (step % 3);
  const deadReckonedMinutes = Math.max(1, 4 - Math.floor(offlineMinutes / 2));

  if (fallbackMode === "schedule") {
    return [
      {
        busId: "BUS-102",
        routeLabel: "Manaoag - Dagupan",
        etaMinutes: 2,
        statusLabel: "SCHEDULE",
        fallbackNote: `Last seen ${offlineMinutes} mins ago`,
      },
      {
        busId: "BUS-103",
        routeLabel: "Manaoag - Dagupan",
        etaMinutes: 15,
        statusLabel: "SCHEDULE",
        fallbackNote: "Based on timetable",
      },
    ];
  }

  if (fallbackMode === "dead-reckoning") {
    return [
      {
        busId: "BUS-102",
        routeLabel: "Manaoag - Dagupan",
        etaMinutes: deadReckonedMinutes,
        statusLabel: "ESTIMATED",
        fallbackNote: "Projected from last GPS + speed",
      },
      {
        busId: "BUS-103",
        routeLabel: "Manaoag - Dagupan",
        etaMinutes: 14,
        statusLabel: "ESTIMATED",
        fallbackNote: "Projection confidence medium",
      },
    ];
  }

  return [
    {
      busId: "BUS-102",
      routeLabel: "Manaoag - Dagupan",
      etaMinutes: bus102Minutes,
      statusLabel: "LIVE",
    },
    {
      busId: "BUS-103",
      routeLabel: "Manaoag - Dagupan",
      etaMinutes: bus103Minutes,
      statusLabel: "LIVE",
    },
  ];
}

export function getRouteProgressPercent(step: number): number {
  const totalSegments = routePolyline.length - 1;
  const currentPoint = step % routePolyline.length;

  if (totalSegments <= 0) {
    return 0;
  }

  return Math.round((currentPoint / totalSegments) * 100);
}

export function getBusStopEtaRows(
  step: number,
  fallbackMode: EtaFallbackMode,
  offlineMinutes: number,
): BusStopEtaRow[] {
  const currentStopIndex = step % stationSeed.length;

  return stationSeed.map((station, index) => {
    const wrappedStops =
      index >= currentStopIndex
        ? index - currentStopIndex
        : stationSeed.length - currentStopIndex + index;

    const liveEta = wrappedStops === 0 ? 1 : wrappedStops * 4 + 1;

    if (fallbackMode === "schedule") {
      return {
        stationId: station.id,
        stationName: station.name,
        etaMinutes: liveEta + 2 + Math.min(offlineMinutes, 6),
        statusLabel: "SCHEDULE" as const,
      };
    }

    if (fallbackMode === "dead-reckoning") {
      return {
        stationId: station.id,
        stationName: station.name,
        etaMinutes: liveEta + 1,
        statusLabel: "ESTIMATED" as const,
      };
    }

    return {
      stationId: station.id,
      stationName: station.name,
      etaMinutes: liveEta,
      statusLabel: "LIVE" as const,
    };
  });
}
