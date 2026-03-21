import MapView, { Circle, Marker, Polyline } from 'react-native-maps';

import { colors } from '../../../shared/theme/tokens';

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
      <Polyline coordinates={routePolyline} strokeColor={colors.green} strokeWidth={4} lineDashPattern={[8, 6]} />
      <Marker
        coordinate={{ latitude: bus.latitude, longitude: bus.longitude }}
        title={bus.id}
        description={`${bus.status} • ${bus.speedKph} km/h`}
      />
      <Circle
        center={{ latitude: bus.latitude, longitude: bus.longitude }}
        radius={210}
        strokeColor={colors.greenBorder}
        fillColor={colors.greenBg}
      />
      {filteredStations.map((station) => (
        <Marker
          key={station.id}
          coordinate={{ latitude: station.latitude, longitude: station.longitude }}
          title={station.name}
          pinColor={station.id === selectedStation.id ? colors.green : colors.blue}
          onPress={() => selectStation(station.id)}
        />
      ))}
    </MapView>
  );
}
