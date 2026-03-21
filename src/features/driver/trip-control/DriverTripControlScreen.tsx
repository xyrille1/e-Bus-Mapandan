import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { spacing } from '../../../shared/theme/tokens';

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
              placeholderTextColor="#88a3d9"
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
    backgroundColor: '#061025',
    padding: spacing.md,
    justifyContent: 'center'
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(67, 108, 184, 0.55)',
    backgroundColor: 'rgba(8, 21, 52, 0.92)',
    padding: spacing.md,
    gap: spacing.sm
  },
  badge: {
    alignSelf: 'flex-start',
    color: '#8dd6ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1
  },
  title: {
    color: '#ebf2ff',
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '900'
  },
  subtitle: {
    color: '#9ab3df',
    fontSize: 13,
    marginTop: -4
  },
  metaGrid: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  metaBlock: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(77, 106, 173, 0.52)',
    backgroundColor: 'rgba(23, 37, 79, 0.75)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2
  },
  metaLabel: {
    color: '#8ba3d1',
    fontSize: 10
  },
  metaValue: {
    color: '#dce7ff',
    fontSize: 13,
    fontWeight: '800'
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  metricCard: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(46, 171, 166, 0.56)',
    backgroundColor: 'rgba(9, 68, 81, 0.52)',
    paddingVertical: spacing.xs,
    alignItems: 'center',
    gap: 2
  },
  metricValue: {
    color: '#b4fff2',
    fontSize: 20,
    lineHeight: 21,
    fontWeight: '900'
  },
  metricLabel: {
    color: '#8ecfcb',
    fontSize: 10,
    fontWeight: '600'
  },
  stationCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(80, 132, 215, 0.52)',
    backgroundColor: 'rgba(17, 41, 94, 0.68)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2
  },
  stationLabel: {
    color: '#91abda',
    fontSize: 10
  },
  stationName: {
    color: '#e4edff',
    fontSize: 15,
    fontWeight: '800'
  },
  stationMeta: {
    color: '#99b6eb',
    fontSize: 10
  },
  stationStatus: {
    color: '#8ce9d7',
    fontSize: 10,
    fontWeight: '700'
  },
  stopActionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  stopActionButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    alignItems: 'center'
  },
  arrivedButton: {
    borderColor: 'rgba(61, 224, 201, 0.72)',
    backgroundColor: 'rgba(8, 99, 87, 0.55)'
  },
  departedButton: {
    borderColor: 'rgba(122, 181, 255, 0.72)',
    backgroundColor: 'rgba(28, 68, 125, 0.58)'
  },
  stopActionText: {
    color: '#def7ff',
    fontSize: 10,
    fontWeight: '800'
  },
  logPanel: {
    marginTop: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(92, 128, 198, 0.52)',
    backgroundColor: 'rgba(11, 30, 72, 0.7)',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: 4
  },
  logTitle: {
    color: '#9fc1ff',
    fontSize: 10,
    fontWeight: '800'
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  logStation: {
    flex: 1,
    color: '#deebff',
    fontSize: 10
  },
  logAction: {
    color: '#5eead4',
    fontSize: 10,
    fontWeight: '700'
  },
  logTime: {
    color: '#9ab6e5',
    fontSize: 10
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  button: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
    flex: 1
  },
  primaryButton: {
    borderColor: 'rgba(45, 201, 178, 0.68)',
    backgroundColor: 'rgba(10, 120, 103, 0.58)'
  },
  warnButton: {
    borderColor: 'rgba(245, 158, 11, 0.72)',
    backgroundColor: 'rgba(146, 92, 19, 0.52)'
  },
  secondaryButton: {
    borderColor: 'rgba(120, 153, 227, 0.72)',
    backgroundColor: 'rgba(40, 67, 128, 0.6)'
  },
  endButton: {
    borderColor: 'rgba(248, 113, 113, 0.7)',
    backgroundColor: 'rgba(127, 29, 29, 0.58)'
  },
  buttonDisabled: {
    opacity: 0.45
  },
  primaryText: {
    color: '#d3fff8',
    fontSize: 12,
    fontWeight: '800'
  },
  warnText: {
    color: '#ffedbf',
    fontSize: 12,
    fontWeight: '800'
  },
  secondaryText: {
    color: '#dbe6ff',
    fontSize: 12,
    fontWeight: '800'
  },
  endText: {
    color: '#ffe1e1',
    fontSize: 12,
    fontWeight: '800'
  },
  tripSummaryPanel: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(110, 168, 255, 0.56)',
    backgroundColor: 'rgba(19, 40, 86, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4
  },
  tripSummaryTitle: {
    color: '#d7e7ff',
    fontSize: 10,
    fontWeight: '800'
  },
  tripSummaryRow: {
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(129, 166, 236, 0.35)',
    paddingTop: 4
  },
  tripSummaryMain: {
    color: '#eef4ff',
    fontSize: 10,
    fontWeight: '700'
  },
  tripSummaryMeta: {
    color: '#b5caf0',
    fontSize: 9
  },
  incidentToggle: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 84, 0.72)',
    backgroundColor: 'rgba(126, 72, 21, 0.5)',
    paddingVertical: 8,
    alignItems: 'center'
  },
  incidentToggleText: {
    color: '#ffe4bd',
    fontSize: 11,
    fontWeight: '800'
  },
  incidentPanel: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(244, 164, 96, 0.52)',
    backgroundColor: 'rgba(62, 39, 16, 0.56)',
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
    color: '#ffe9cf',
    fontSize: 11,
    fontWeight: '800',
    flex: 1
  },
  incidentTypeChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 139, 0.74)',
    backgroundColor: 'rgba(147, 89, 29, 0.65)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  incidentTypeText: {
    color: '#fff1da',
    fontSize: 10,
    fontWeight: '700'
  },
  incidentInput: {
    minHeight: 66,
    maxHeight: 104,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(250, 191, 124, 0.62)',
    backgroundColor: 'rgba(90, 55, 20, 0.58)',
    color: '#fff3df',
    fontSize: 12,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  incidentSubmit: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(253, 186, 116, 0.76)',
    backgroundColor: 'rgba(180, 100, 28, 0.62)',
    paddingVertical: 7,
    alignItems: 'center'
  },
  incidentSubmitText: {
    color: '#fff6e8',
    fontSize: 11,
    fontWeight: '800'
  },
  incidentBanner: {
    color: '#ffe3c2',
    fontSize: 10,
    lineHeight: 13
  }
});
