import { StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '../../../shared/components/StatusPill';
import { colors, radii, spacing } from '../../../shared/theme/tokens';

import { useOfflineBootstrap } from './useOfflineBootstrap';

function formatTime(isoTime: string): string {
  return new Date(isoTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function OfflineFirstHomeScreen() {
  const { schedule, isSyncing, errorMessage, statusTone } = useOfflineBootstrap();

  return (
    <View style={styles.root}>
      <View style={styles.headerCard}>
        <Text style={styles.kicker}>BusTrack PH</Text>
        <Text style={styles.headline}>Live Arrival Board</Text>
        <Text style={styles.subhead}>{schedule.routeName}</Text>
      </View>

      <View style={styles.statusRow}>
        <StatusPill
          tone={statusTone}
          label={
            isSyncing
              ? 'Syncing latest data'
              : errorMessage
              ? 'Offline mode'
              : 'Live updates connected'
          }
        />
        <Text style={styles.syncMeta}>Last sync {formatTime(schedule.lastSyncAt)}</Text>
      </View>

      <View style={styles.stationCard}>
        <Text style={styles.stationLabel}>Station</Text>
        <Text style={styles.stationName}>{schedule.stationName}</Text>

        <View style={styles.listWrap}>
          {schedule.upcomingBuses.map((item: string) => (
            <View key={item} style={styles.listItem}>
              <Text style={styles.listItemText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Estimated - Live data unavailable</Text>
          <Text style={styles.noticeText}>{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgCanvas,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.lg
  },
  headerCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.xs
  },
  headline: {
    fontSize: 36,
    lineHeight: 40,
    color: colors.textPrimary,
    fontFamily: 'Georgia'
  },
  subhead: {
    marginTop: spacing.xs,
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '600'
  },
  statusRow: {
    gap: spacing.xs
  },
  syncMeta: {
    color: colors.textMuted,
    fontSize: 13
  },
  stationCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm
  },
  stationLabel: {
    color: colors.textMuted,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  stationName: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700'
  },
  listWrap: {
    marginTop: spacing.sm,
    gap: spacing.sm
  },
  listItem: {
    backgroundColor: '#f8efdf',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  listItemText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 16
  },
  noticeCard: {
    borderRadius: radii.md,
    backgroundColor: colors.warningSoft,
    borderColor: '#fdba74',
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs
  },
  noticeTitle: {
    color: colors.warning,
    fontWeight: '800',
    fontSize: 14
  },
  noticeText: {
    color: '#9a3412',
    fontSize: 13,
    lineHeight: 18
  }
});
