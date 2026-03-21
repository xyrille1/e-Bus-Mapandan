import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, shadow, spacing, typography } from '../../../shared/theme/tokens';

import { useDriverTripControl } from './useDriverTripControl';

function formatLastSeen(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function DriverTripControlScreen() {
  const {
    busId,
    routeName,
    phase,
    nextStation,
    occupancyPercent,
    speedKph,
    etaToNextStopMins,
    syncHealth,
    healthTone,
    lastUpdateAt,
    stationStatus,
    stationLog,
    isIncidentPanelVisible,
    incidentType,
    incidentNote,
    incidentStatus,
    incidentBanner,
    completedTrips,
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
  } = useDriverTripControl();

  const isIdle = phase === 'idle' || phase === 'completed';
  const isPaused = phase === 'paused';
  const isRunning = phase === 'running';

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.badge}>DRIVER MODE</Text>
        <Text style={styles.title}>{busId}</Text>
        <Text style={styles.subtitle}>{routeName}</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Trip State</Text>
            <Text style={styles.metaValue}>{phase.toUpperCase()}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Sync Health</Text>
            <Text style={[styles.metaValue, { color: healthTone }]}>{syncHealth.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{speedKph}</Text>
            <Text style={styles.metricLabel}>km/h</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{occupancyPercent}%</Text>
            <Text style={styles.metricLabel}>Occupancy</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{etaToNextStopMins}</Text>
            <Text style={styles.metricLabel}>min ETA</Text>
          </View>
        </View>

        <View style={styles.stationCard}>
          <Text style={styles.stationLabel}>Next Station</Text>
          <Text style={styles.stationName}>{nextStation}</Text>
          <Text style={styles.stationStatus}>
            {stationStatus === 'arrived' ? 'ARRIVED AT STOP' : 'EN ROUTE TO STOP'}
          </Text>
          <Text style={styles.stationMeta}>Last update {formatLastSeen(lastUpdateAt)}</Text>

          <View style={styles.stopActionRow}>
            <Pressable
              style={[styles.stopActionButton, styles.arrivedButton, !isRunning ? styles.buttonDisabled : null]}
              onPress={markArrivedAtStop}
              disabled={!isRunning}
            >
              <Text style={styles.stopActionText}>Mark Arrived</Text>
            </Pressable>
            <Pressable
              style={[styles.stopActionButton, styles.departedButton, isIdle ? styles.buttonDisabled : null]}
              onPress={markDepartedFromStop}
              disabled={isIdle}
            >
              <Text style={styles.stopActionText}>Mark Departed</Text>
            </Pressable>
          </View>

          {stationLog.length > 0 ? (
            <View style={styles.logPanel}>
              <Text style={styles.logTitle}>Recent Check-Ins</Text>
              {stationLog.map((entry, index) => (
                <View key={`${entry.station}-${entry.at}-${index}`} style={styles.logRow}>
                  <Text style={styles.logStation}>{entry.station}</Text>
                  <Text style={styles.logAction}>{entry.action}</Text>
                  <Text style={styles.logTime}>{formatLastSeen(entry.at)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.button, styles.primaryButton, !isIdle ? styles.buttonDisabled : null]}
            onPress={startTrip}
            disabled={!isIdle}
          >
            <Text style={styles.primaryText}>Start</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.warnButton, !isRunning ? styles.buttonDisabled : null]}
            onPress={pauseTrip}
            disabled={!isRunning}
          >
            <Text style={styles.warnText}>Pause</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.secondaryButton, !isPaused ? styles.buttonDisabled : null]}
            onPress={resumeTrip}
            disabled={!isPaused}
          >
            <Text style={styles.secondaryText}>Resume</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.button, styles.endButton, isIdle ? styles.buttonDisabled : null]}
          onPress={endTrip}
          disabled={isIdle}
        >
          <Text style={styles.endText}>End Trip</Text>
        </Pressable>

        {completedTrips.length > 0 ? (
          <View style={styles.tripSummaryPanel}>
            <Text style={styles.tripSummaryTitle}>Recent Completed Trips</Text>
            {completedTrips.map((trip) => (
              <View key={trip.id} style={styles.tripSummaryRow}>
                <Text style={styles.tripSummaryMain}>
                  {trip.durationMins} mins • {trip.stationEvents} stop events
                </Text>
                <Text style={styles.tripSummaryMeta}>
                  Incidents: {trip.incidentsReported} • Ended {formatLastSeen(trip.endedAt)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable style={styles.incidentToggle} onPress={toggleIncidentPanel}>
          <Text style={styles.incidentToggleText}>
            {isIncidentPanelVisible ? 'Close Incident Report' : 'Report Incident'}
          </Text>
        </Pressable>

        {isIncidentPanelVisible ? (
          <View style={styles.incidentPanel}>
            <View style={styles.incidentHeaderRow}>
              <Text style={styles.incidentTitle}>Dispatch Incident Report</Text>
              <Pressable style={styles.incidentTypeChip} onPress={cycleIncidentType}>
                <Text style={styles.incidentTypeText}>{incidentType}</Text>
              </Pressable>
            </View>

            <TextInput
              value={incidentNote}
              onChangeText={setIncidentNote}
              placeholder="Add incident details for dispatch..."
              placeholderTextColor={colors.ink3}
              multiline
              style={styles.incidentInput}
            />

            <Pressable
              style={[styles.incidentSubmit, incidentStatus === 'sending' ? styles.buttonDisabled : null]}
              onPress={submitIncident}
              disabled={incidentStatus === 'sending'}
            >
              <Text style={styles.incidentSubmitText}>
                {incidentStatus === 'sending' ? 'Submitting...' : 'Submit Incident'}
              </Text>
            </Pressable>

            {incidentBanner ? <Text style={styles.incidentBanner}>{incidentBanner}</Text> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.md,
    justifyContent: 'center'
  },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.lg
  },
  badge: {
    alignSelf: 'flex-start',
    color: colors.blue,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: typography.fontBody
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '900',
    fontFamily: typography.fontDisplay
  },
  subtitle: {
    color: colors.ink2,
    fontSize: 13,
    marginTop: -4,
    fontFamily: typography.fontBody
  },
  metaGrid: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  metaBlock: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2
  },
  metaLabel: {
    color: colors.ink3,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  metaValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  metricCard: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    gap: 2
  },
  metricValue: {
    color: colors.green,
    fontSize: 20,
    lineHeight: 21,
    fontWeight: '900',
    fontFamily: typography.fontDisplay
  },
  metricLabel: {
    color: colors.ink2,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: typography.fontBody
  },
  stationCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2
  },
  stationLabel: {
    color: colors.ink3,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  stationName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  stationMeta: {
    color: colors.ink3,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  stationStatus: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  stopActionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  stopActionButton: {
    flex: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingVertical: 6,
    alignItems: 'center'
  },
  arrivedButton: {
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg
  },
  departedButton: {
    borderColor: colors.blueBorder,
    backgroundColor: colors.blueBg
  },
  stopActionText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fontBody
  },
  logPanel: {
    marginTop: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: 4
  },
  logTitle: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  logStation: {
    flex: 1,
    color: colors.ink,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  logAction: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  logTime: {
    color: colors.ink3,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  button: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
    flex: 1
  },
  primaryButton: {
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg
  },
  warnButton: {
    borderColor: colors.amberBorder,
    backgroundColor: colors.amberBg
  },
  secondaryButton: {
    borderColor: colors.blueBorder,
    backgroundColor: colors.blueBg
  },
  endButton: {
    borderColor: colors.redBorder,
    backgroundColor: colors.redBg
  },
  buttonDisabled: {
    opacity: 0.45
  },
  primaryText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: typography.fontBody
  },
  warnText: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: typography.fontBody
  },
  secondaryText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: typography.fontBody
  },
  endText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: typography.fontBody
  },
  tripSummaryPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4
  },
  tripSummaryTitle: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  tripSummaryRow: {
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4
  },
  tripSummaryMain: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  tripSummaryMeta: {
    color: colors.ink3,
    fontSize: 9,
    fontFamily: typography.fontBody
  },
  incidentToggle: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    backgroundColor: colors.amberBg,
    paddingVertical: 8,
    alignItems: 'center'
  },
  incidentToggleText: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  incidentPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    backgroundColor: colors.amberBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  incidentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs
  },
  incidentTitle: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
    fontFamily: typography.fontDisplay
  },
  incidentTypeChip: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  incidentTypeText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  incidentInput: {
    minHeight: 66,
    maxHeight: 104,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 12,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontFamily: typography.fontBody
  },
  incidentSubmit: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    backgroundColor: colors.surface,
    paddingVertical: 7,
    alignItems: 'center'
  },
  incidentSubmitText: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.fontBody
  },
  incidentBanner: {
    color: colors.ink2,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: typography.fontBody
  }
});
