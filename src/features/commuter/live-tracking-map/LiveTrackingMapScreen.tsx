import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { radii, spacing } from '../../../shared/theme/tokens';

import { RouteMap } from './RouteMap';
import { useLiveBusTracking } from './useLiveBusTracking';

function formatLastSeen(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatCoords(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lngDir = longitude >= 0 ? 'E' : 'W';

  return `${Math.abs(latitude).toFixed(3)}° ${latDir}, ${Math.abs(longitude).toFixed(3)}° ${lngDir}`;
}

export function LiveTrackingMapScreen() {
  const {
    bus,
    isLoading,
    errorMessage,
    routeName,
    routePolyline,
    initialRegion,
    selectedStation,
    searchQuery,
    filteredStations,
    setSearchQuery,
    selectStation,
    toggleBusDetail,
    isBusDetailVisible,
    routeProgressPercent,
    busStopEtaRows,
    cycleWakeAlert,
    dismissWakeAlert,
    toggleNotificationsEnabled,
    cycleNotificationLeadMinutes,
    cycleNotificationChannel,
    toggleQuietHours,
    notificationModeLabel,
    notificationLeadMinutes,
    notificationChannel,
    quietHoursEnabled,
    toggleFeedbackSheet,
    cycleFeedbackCategory,
    setFeedbackMessage,
    submitFeedback,
    isFeedbackVisible,
    feedbackCategory,
    feedbackMessage,
    feedbackStatus,
    feedbackBanner,
    authStatus,
    profileName,
    savedRoutes,
    signInCommuter,
    useGuestMode,
    alertStatus,
    alertMessage,
    alertArmed,
    alertRadiusLabel,
    distanceToSelectedStationMeters,
    etaRows,
    fallbackMode,
    offlineMinutes,
    syncStatus,
    syncMessage,
    deltaUsageLabel
  } = useLiveBusTracking();

  return (
    <View style={styles.root}>
      <RouteMap
        style={styles.map}
        initialRegion={initialRegion}
        routePolyline={routePolyline}
        bus={bus}
        filteredStations={filteredStations}
        selectedStation={selectedStation}
        selectStation={selectStation}
      />

      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>◦</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search stations..."
            placeholderTextColor="#7281a8"
            style={styles.searchInput}
          />
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>
              {fallbackMode === 'live' ? 'Live' : fallbackMode === 'dead-reckoning' ? 'Estimated' : 'Offline'}
            </Text>
          </View>
        </View>

        {searchQuery.trim().length > 0 ? (
          <View style={styles.searchResultPanel}>
            {filteredStations.slice(0, 4).map((station) => (
              <Pressable
                key={station.id}
                style={styles.searchResultItem}
                onPress={() => selectStation(station.id)}
              >
                <Text style={styles.searchResultName}>{station.name}</Text>
                <Text style={styles.searchResultCoords}>
                  {formatCoords(station.latitude, station.longitude)}
                </Text>
              </Pressable>
            ))}
            {filteredStations.length === 0 ? (
              <Text style={styles.emptySearchText}>No station match found</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {fallbackMode !== 'live' ? (
        <View style={styles.caveatBanner}>
          <Text style={styles.caveatTitle}>Estimated - Live data unavailable</Text>
          <Text style={styles.caveatBody}>
            {fallbackMode === 'dead-reckoning'
              ? `Projecting bus position from last speed (${offlineMinutes} mins offline).`
              : `Switched to schedule fallback after ${offlineMinutes} mins without GPS.`}
          </Text>
        </View>
      ) : null}

      {alertStatus === 'triggered' && alertMessage ? (
        <View style={styles.alertBanner}>
          <Text style={styles.alertTitle}>Wake Alert Triggered</Text>
          <Text style={styles.alertBody}>{alertMessage}</Text>
          <Pressable style={styles.alertDismiss} onPress={dismissWakeAlert}>
            <Text style={styles.alertDismissText}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.stationSheet}>
        <Text style={styles.stationName}>{selectedStation.name}</Text>
        <Text style={styles.stationCoords}>
          {formatCoords(selectedStation.latitude, selectedStation.longitude)}
        </Text>

        <View style={styles.etaList}>
          {etaRows.map((row, index) => (
            <View key={row.busId} style={[styles.etaCard, index === 0 ? styles.etaCardPrimary : undefined]}>
              <View style={styles.etaLeft}>
                <Text style={styles.busCode}>{row.busId}</Text>
                <Text style={styles.routeLabel}>{row.routeLabel}</Text>
                {row.fallbackNote ? <Text style={styles.fallbackText}>{row.fallbackNote}</Text> : null}
              </View>

              <View style={styles.etaRight}>
                <Text style={styles.etaMinutes}>{row.etaMinutes}</Text>
                <Text style={styles.etaUnits}>mins</Text>
                <Text style={styles.liveTag}>{row.statusLabel}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable style={styles.wakeButton} onPress={cycleWakeAlert}>
          <Text style={styles.wakeButtonText}>
            {alertArmed ? `Wake Alert: ${alertRadiusLabel}` : 'Wake Me Up'}
          </Text>
          <Text style={styles.wakeHintText}>
            {alertArmed
              ? `Bus is ${distanceToSelectedStationMeters} m from ${selectedStation.name}`
              : 'Tap to arm 500m, 1km, or 2km geofence alert'}
          </Text>
        </Pressable>

        <View style={styles.prefPanel}>
          <Text style={styles.prefTitle}>Notification Preferences</Text>
          <View style={styles.prefRow}>
            <Pressable style={styles.prefChip} onPress={toggleNotificationsEnabled}>
              <Text style={styles.prefChipLabel}>Status: {notificationModeLabel}</Text>
            </Pressable>
            <Pressable style={styles.prefChip} onPress={cycleNotificationChannel}>
              <Text style={styles.prefChipLabel}>Channel: {notificationChannel}</Text>
            </Pressable>
          </View>
          <View style={styles.prefRow}>
            <Pressable style={styles.prefChip} onPress={cycleNotificationLeadMinutes}>
              <Text style={styles.prefChipLabel}>Lead: {notificationLeadMinutes} min</Text>
            </Pressable>
            <Pressable style={styles.prefChip} onPress={toggleQuietHours}>
              <Text style={styles.prefChipLabel}>
                Quiet Hours: {quietHoursEnabled ? 'On' : 'Off'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.accountPanel}>
          <View style={styles.accountHeaderRow}>
            <Text style={styles.accountTitle}>Account Mode</Text>
            <Text style={styles.accountStatus}>{authStatus === 'signed-in' ? 'Signed In' : 'Guest'}</Text>
          </View>
          <Text style={styles.accountMeta}>Profile: {profileName}</Text>
          <Text style={styles.accountMeta}>Saved routes: {savedRoutes}</Text>
          <View style={styles.accountActionRow}>
            <Pressable style={styles.accountButton} onPress={signInCommuter}>
              <Text style={styles.accountButtonText}>Sign In</Text>
            </Pressable>
            <Pressable style={styles.accountButtonSecondary} onPress={useGuestMode}>
              <Text style={styles.accountButtonSecondaryText}>Use Guest</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaTextLeft}>{routeName}</Text>
          <Text style={styles.metaTextRight}>
            {bus.id} • {bus.status} • {formatLastSeen(bus.updatedAt)}
          </Text>
        </View>

        <Pressable style={styles.detailButton} onPress={toggleBusDetail}>
          <Text style={styles.detailButtonText}>
            {isBusDetailVisible ? 'Hide Bus Details' : 'View Bus Details'}
          </Text>
          <Text style={styles.detailButtonHint}>Speed {bus.speedKph} km/h • Tap for full ETA timeline</Text>
        </Pressable>

        <Pressable style={styles.feedbackEntryButton} onPress={toggleFeedbackSheet}>
          <Text style={styles.feedbackEntryButtonText}>
            {isFeedbackVisible ? 'Close Feedback' : 'Send Feedback'}
          </Text>
          <Text style={styles.feedbackEntryHint}>Report delays, crowding, or bus concerns</Text>
        </Pressable>

        <View style={styles.deltaRow}>
          <Text style={styles.deltaLabel}>
            {syncStatus === 'syncing'
              ? 'Delta Syncing...'
              : syncStatus === 'failed'
              ? 'Delta Sync Failed'
              : 'Delta Sync'}
          </Text>
          <Text style={styles.deltaValue}>
            {syncMessage && deltaUsageLabel
              ? `${syncMessage} • ${deltaUsageLabel}`
              : syncMessage
              ? syncMessage
              : 'No changes'}
          </Text>
        </View>

        {isBusDetailVisible ? (
          <View style={styles.detailPanel}>
            <View style={styles.detailHeaderRow}>
              <Text style={styles.detailTitle}>{bus.id} Trip Overview</Text>
              <Text style={styles.detailTag}>{fallbackMode === 'live' ? 'LIVE' : 'EST'}</Text>
            </View>

            <Text style={styles.detailCoords}>{formatCoords(bus.latitude, bus.longitude)}</Text>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${routeProgressPercent}%` }]} />
            </View>
            <Text style={styles.progressLabel}>Route progress: {routeProgressPercent}%</Text>

            <View style={styles.stopList}>
              {busStopEtaRows.map((row) => (
                <View key={row.stationId} style={styles.stopRow}>
                  <Text style={styles.stopName}>{row.stationName}</Text>
                  <Text style={styles.stopEta}>
                    {row.etaMinutes}m • {row.statusLabel}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {isFeedbackVisible ? (
          <View style={styles.feedbackPanel}>
            <View style={styles.feedbackHeaderRow}>
              <Text style={styles.feedbackTitle}>Commuter Feedback</Text>
              <Pressable style={styles.feedbackCategoryChip} onPress={cycleFeedbackCategory}>
                <Text style={styles.feedbackCategoryText}>{feedbackCategory}</Text>
              </Pressable>
            </View>

            <TextInput
              value={feedbackMessage}
              onChangeText={setFeedbackMessage}
              placeholder="Describe what happened..."
              placeholderTextColor="#7f95c9"
              multiline
              style={styles.feedbackInput}
            />

            <Pressable
              style={[styles.feedbackSubmitButton, feedbackStatus === 'sending' ? styles.feedbackSubmitDisabled : null]}
              onPress={submitFeedback}
              disabled={feedbackStatus === 'sending'}
            >
              <Text style={styles.feedbackSubmitText}>
                {feedbackStatus === 'sending' ? 'Submitting...' : 'Submit Feedback'}
              </Text>
            </Pressable>

            {feedbackBanner ? <Text style={styles.feedbackBanner}>{feedbackBanner}</Text> : null}
          </View>
        ) : null}

        <View style={styles.tabBar}>
          <Text style={[styles.tabItem, styles.tabItemActive]}>MAP</Text>
          <Text style={styles.tabItem}>ALERTS</Text>
          <Text style={styles.tabItem}>HOME</Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>

      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0ac9a6" />
          <Text style={styles.loadingText}>Loading live bus tracking...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#040b22'
  },
  map: {
    flex: 1
  },
  searchBarWrap: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg
  },
  searchBar: {
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(7, 16, 45, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(69, 90, 150, 0.48)',
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs
  },
  searchIcon: {
    color: '#4ea2ff',
    fontSize: 22,
    lineHeight: 24
  },
  searchText: {
    flex: 1,
    color: '#9aa8cc',
    fontSize: 14,
    fontWeight: '500'
  },
  searchInput: {
    flex: 1,
    color: '#d8e4ff',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0
  },
  searchResultPanel: {
    marginTop: spacing.xs,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 21, 54, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(66, 89, 149, 0.62)',
    overflow: 'hidden'
  },
  searchResultItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(44, 63, 115, 0.45)'
  },
  searchResultName: {
    color: '#e4ecff',
    fontSize: 13,
    fontWeight: '700'
  },
  searchResultCoords: {
    marginTop: 2,
    color: '#8ea2d3',
    fontSize: 10
  },
  emptySearchText: {
    color: '#a3b4dc',
    fontSize: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  offlineBadge: {
    backgroundColor: 'rgba(18, 32, 71, 0.96)',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(93, 112, 170, 0.62)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5
  },
  offlineBadgeText: {
    color: '#d9e2ff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4
  },
  stationSheet: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.sm,
    backgroundColor: 'rgba(8, 17, 45, 0.94)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(53, 78, 141, 0.55)',
    padding: spacing.md,
    gap: spacing.sm
  },
  caveatBanner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 268,
    borderRadius: 11,
    backgroundColor: 'rgba(102, 33, 6, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2
  },
  alertBanner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 328,
    borderRadius: 11,
    backgroundColor: 'rgba(4, 78, 60, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4
  },
  alertTitle: {
    color: '#5eead4',
    fontWeight: '800',
    fontSize: 12
  },
  alertBody: {
    color: '#ccfbf1',
    fontSize: 11,
    lineHeight: 14
  },
  alertDismiss: {
    alignSelf: 'flex-start',
    marginTop: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.8)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2
  },
  alertDismissText: {
    color: '#99f6e4',
    fontSize: 10,
    fontWeight: '700'
  },
  caveatTitle: {
    color: '#fcd34d',
    fontWeight: '800',
    fontSize: 12
  },
  caveatBody: {
    color: '#fde68a',
    fontSize: 11,
    lineHeight: 14
  },
  stationName: {
    color: '#eef3ff',
    fontSize: 29,
    lineHeight: 32,
    fontWeight: '800'
  },
  stationCoords: {
    marginTop: -2,
    color: '#7b8bb8',
    fontSize: 12
  },
  etaList: {
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  etaCard: {
    borderRadius: 13,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(23, 38, 84, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(73, 96, 157, 0.5)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  etaCardPrimary: {
    backgroundColor: 'rgba(11, 77, 87, 0.62)',
    borderColor: 'rgba(38, 173, 156, 0.58)'
  },
  etaLeft: {
    gap: 2
  },
  busCode: {
    color: '#d8f2ff',
    fontSize: 14,
    fontWeight: '700'
  },
  routeLabel: {
    color: '#93a3d0',
    fontSize: 11
  },
  fallbackText: {
    color: '#fbbf24',
    fontSize: 10,
    marginTop: 2
  },
  etaRight: {
    alignItems: 'flex-end'
  },
  etaMinutes: {
    color: '#1fe6c1',
    fontSize: 31,
    lineHeight: 30,
    fontWeight: '900'
  },
  etaUnits: {
    color: '#9aa8cc',
    fontSize: 10,
    marginTop: 2
  },
  liveTag: {
    color: '#0ad8b1',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '700'
  },
  wakeButton: {
    marginTop: spacing.xs,
    height: 32,
    borderRadius: 11,
    backgroundColor: 'rgba(12, 107, 101, 0.56)',
    borderWidth: 1,
    borderColor: 'rgba(18, 198, 179, 0.62)',
    justifyContent: 'center',
    paddingHorizontal: spacing.md
  },
  wakeButtonText: {
    color: '#1ce3bb',
    fontWeight: '800',
    fontSize: 13
  },
  wakeHintText: {
    marginTop: 2,
    color: '#8be8d8',
    fontSize: 10,
    lineHeight: 12
  },
  prefPanel: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 98, 164, 0.48)',
    backgroundColor: 'rgba(17, 31, 75, 0.68)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 6
  },
  prefTitle: {
    color: '#acc9ff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  prefRow: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  prefChip: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(93, 128, 205, 0.52)',
    backgroundColor: 'rgba(22, 43, 94, 0.74)',
    paddingVertical: 6,
    paddingHorizontal: spacing.xs
  },
  prefChipLabel: {
    color: '#d8e6ff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center'
  },
  accountPanel: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(86, 104, 176, 0.52)',
    backgroundColor: 'rgba(23, 30, 70, 0.74)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 5
  },
  accountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  accountTitle: {
    color: '#bfd4ff',
    fontSize: 11,
    fontWeight: '800'
  },
  accountStatus: {
    color: '#85f0d7',
    fontSize: 10,
    fontWeight: '800'
  },
  accountMeta: {
    color: '#a9bee9',
    fontSize: 10
  },
  accountActionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 2
  },
  accountButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(98, 201, 239, 0.72)',
    backgroundColor: 'rgba(17, 97, 132, 0.64)',
    paddingVertical: 6,
    alignItems: 'center'
  },
  accountButtonText: {
    color: '#d8f7ff',
    fontSize: 10,
    fontWeight: '800'
  },
  accountButtonSecondary: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(115, 129, 192, 0.62)',
    backgroundColor: 'rgba(33, 47, 93, 0.78)',
    paddingVertical: 6,
    alignItems: 'center'
  },
  accountButtonSecondaryText: {
    color: '#d0ddff',
    fontSize: 10,
    fontWeight: '700'
  },
  metaRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm
  },
  metaTextLeft: {
    color: '#6f82b5',
    fontSize: 11,
    flex: 1
  },
  metaTextRight: {
    color: '#9ec6ff',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right'
  },
  detailButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(65, 95, 168, 0.58)',
    backgroundColor: 'rgba(15, 31, 76, 0.74)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    gap: 2
  },
  detailButtonText: {
    color: '#98bfff',
    fontSize: 12,
    fontWeight: '800'
  },
  detailButtonHint: {
    color: '#7e9fda',
    fontSize: 10
  },
  feedbackEntryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(54, 122, 190, 0.56)',
    backgroundColor: 'rgba(9, 44, 90, 0.64)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    gap: 2
  },
  feedbackEntryButtonText: {
    color: '#8dccff',
    fontSize: 12,
    fontWeight: '800'
  },
  feedbackEntryHint: {
    color: '#82b0da',
    fontSize: 10
  },
  tabBar: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 74, 134, 0.45)'
  },
  detailPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(44, 170, 169, 0.54)',
    backgroundColor: 'rgba(8, 44, 61, 0.62)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailTitle: {
    color: '#b8fff0',
    fontSize: 12,
    fontWeight: '800'
  },
  detailTag: {
    color: '#43efc8',
    fontSize: 10,
    fontWeight: '800'
  },
  detailCoords: {
    color: '#9ed9ff',
    fontSize: 10
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(34, 74, 108, 0.82)',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10d6b4'
  },
  progressLabel: {
    color: '#84cdd5',
    fontSize: 10,
    fontWeight: '600'
  },
  stopList: {
    gap: 4
  },
  stopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  stopName: {
    color: '#d8f8ff',
    fontSize: 10,
    flex: 1,
    paddingRight: spacing.xs
  },
  stopEta: {
    color: '#4de8c8',
    fontSize: 10,
    fontWeight: '700'
  },
  feedbackPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(67, 122, 205, 0.56)',
    backgroundColor: 'rgba(8, 33, 76, 0.68)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs
  },
  feedbackTitle: {
    color: '#d0e5ff',
    fontSize: 12,
    fontWeight: '800',
    flex: 1
  },
  feedbackCategoryChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(117, 169, 255, 0.7)',
    backgroundColor: 'rgba(24, 67, 126, 0.78)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  feedbackCategoryText: {
    color: '#dbeaff',
    fontSize: 10,
    fontWeight: '700'
  },
  feedbackInput: {
    minHeight: 70,
    maxHeight: 110,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(83, 128, 199, 0.62)',
    backgroundColor: 'rgba(13, 40, 87, 0.76)',
    color: '#e7f0ff',
    fontSize: 12,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  feedbackSubmitButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(81, 196, 241, 0.74)',
    backgroundColor: 'rgba(9, 109, 152, 0.62)',
    paddingVertical: 7,
    alignItems: 'center'
  },
  feedbackSubmitDisabled: {
    opacity: 0.65
  },
  feedbackSubmitText: {
    color: '#d8f6ff',
    fontSize: 11,
    fontWeight: '800'
  },
  feedbackBanner: {
    color: '#97d7ff',
    fontSize: 10,
    lineHeight: 13
  },
  deltaRow: {
    marginTop: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(41, 66, 126, 0.58)',
    backgroundColor: 'rgba(16, 29, 69, 0.78)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: 2
  },
  deltaLabel: {
    color: '#6fb9ff',
    fontSize: 10,
    letterSpacing: 0.4,
    fontWeight: '700'
  },
  deltaValue: {
    color: '#b4d2ff',
    fontSize: 11,
    fontWeight: '600'
  },
  tabItem: {
    color: '#6878a5',
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '700'
  },
  tabItemActive: {
    color: '#17dcb8'
  },
  errorText: {
    color: '#ffb454',
    fontSize: 12
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 8, 30, 0.82)',
    gap: spacing.sm
  },
  loadingText: {
    color: '#dce6ff',
    fontWeight: '700'
  }
});
