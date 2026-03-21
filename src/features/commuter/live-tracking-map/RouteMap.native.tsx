import MapView, { Circle, Marker, Polyline } from 'react-native-maps';

import type { RouteMapProps } from './RouteMap.types';

export function RouteMap({
  style,
  initialRegion,
  routePolyline,
  bus,
  filteredStations,
  selectedStation,
  selectStation
}: RouteMapProps) {
  return (
    <MapView style={style} initialRegion={initialRegion} mapType="standard">
      <Polyline coordinates={routePolyline} strokeColor="#08c6a4" strokeWidth={4} lineDashPattern={[8, 6]} />
      <Marker
        coordinate={{ latitude: bus.latitude, longitude: bus.longitude }}
        title={bus.id}
        description={`${bus.status} • ${bus.speedKph} km/h`}
      />
      <Circle
        center={{ latitude: bus.latitude, longitude: bus.longitude }}
        radius={210}
        strokeColor="rgba(12, 238, 188, 0.42)"
        fillColor="rgba(9, 216, 176, 0.14)"
      />
      {filteredStations.map((station) => (
        <Marker
          key={station.id}
          coordinate={{ latitude: station.latitude, longitude: station.longitude }}
          title={station.name}
          pinColor={station.id === selectedStation.id ? '#10d6b4' : '#6f8dd6'}
          onPress={() => selectStation(station.id)}
        />
      ))}
    </MapView>
  );
}
