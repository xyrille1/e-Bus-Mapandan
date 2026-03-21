import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '../../../shared/theme/tokens';

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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMd,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8
  },
  title: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  meta: {
    color: colors.ink2,
    fontSize: 11,
    fontFamily: typography.fontBody
  },
  subTitle: {
    color: colors.ink2,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  stationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  stationChip: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  stationChipActive: {
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg
  },
  stationChipText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  }
});
