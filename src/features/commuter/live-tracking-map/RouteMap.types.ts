import type { StyleProp, ViewStyle } from 'react-native';

import type { BusSnapshot, StationSnapshot } from './liveTrackingMock';

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type RouteMapProps = {
  style: StyleProp<ViewStyle>;
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  routePolyline: RoutePoint[];
  bus: BusSnapshot;
  filteredStations: StationSnapshot[];
  selectedStation: StationSnapshot;
  selectStation: (stationId: string) => void;
};
