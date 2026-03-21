import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RouteMapProps } from './RouteMap.types';

export function RouteMap({ style, bus, filteredStations, selectedStation, selectStation }: RouteMapProps) {
  return (
    <View style={[style, styles.webMap]}>
      <Text style={styles.title}>Web Map Preview</Text>
      <Text style={styles.meta}>{bus.id} • {bus.status} • {bus.speedKph} km/h</Text>
      <Text style={styles.subTitle}>Stations</Text>
      <View style={styles.stationRow}>
        {filteredStations.slice(0, 6).map((station) => (
          <Pressable
            key={station.id}
            style={[styles.stationChip, station.id === selectedStation.id ? styles.stationChipActive : null]}
            onPress={() => selectStation(station.id)}
          >
            <Text style={styles.stationChipText}>{station.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webMap: {
    backgroundColor: '#091632',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(84, 113, 181, 0.45)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8
  },
  title: {
    color: '#dbeafe',
    fontSize: 14,
    fontWeight: '800'
  },
  meta: {
    color: '#9cc4ff',
    fontSize: 11
  },
  subTitle: {
    color: '#b7d4ff',
    fontSize: 10,
    fontWeight: '700'
  },
  stationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  stationChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(106, 131, 196, 0.65)',
    backgroundColor: 'rgba(28, 47, 92, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  stationChipActive: {
    borderColor: 'rgba(52, 211, 153, 0.8)',
    backgroundColor: 'rgba(7, 92, 74, 0.75)'
  },
  stationChipText: {
    color: '#e5edff',
    fontSize: 10,
    fontWeight: '700'
  }
});
