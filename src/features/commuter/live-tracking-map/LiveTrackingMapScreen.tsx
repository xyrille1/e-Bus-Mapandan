import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, shadow, spacing, typography } from '../../../shared/theme/tokens';

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

  const notificationsEnabled = useMemo(() => {
    const normalized = notificationModeLabel.toLowerCase();
    return normalized.includes('on') || normalized.includes('enable');
  }, [notificationModeLabel]);
  const livePulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulseAnim, {
          toValue: 1,
          duration: 850,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(livePulseAnim, {
          toValue: 0,
          duration: 1150,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        })
      ])
    );

    loop.start();

    return () => {
      loop.stop();
      livePulseAnim.setValue(0);
    };
  }, [livePulseAnim]);

  const pulseScale = livePulseAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 1.28, 1]
  });
  const pulseOpacity = livePulseAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.92, 0.58, 0.92]
  });

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
            placeholderTextColor={colors.ink3}
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
        <View style={styles.sheetHandle} />

        <View style={styles.sheetHeaderRow}>
          <View style={styles.sheetTitleGroup}>
            <Text style={styles.sheetRouteTitle}>{selectedStation.name}</Text>
            <View style={styles.lineBadge}>
              <Text style={styles.lineBadgeText}>{bus.id}</Text>
            </View>
          </View>
          <View style={styles.sheetIconGroup}>
            <Pressable style={styles.sheetIconButton} onPress={cycleNotificationChannel} accessibilityLabel="Cycle channel">
              <Text style={styles.sheetIconGlyph}>✏</Text>
            </Pressable>
            <Pressable style={styles.sheetIconButton} onPress={cycleWakeAlert} accessibilityLabel="Cycle wake alert">
              <Text style={styles.sheetIconGlyph}>↑</Text>
            </Pressable>
          </View>
        </View>

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
              <View style={styles.stopTimelineLine} />
              {busStopEtaRows.map((row, index) => (
                <View key={row.stationId} style={styles.stopRow}>
                  <View style={[styles.stopDot, index === 0 ? styles.stopDotActive : styles.stopDotInactive]} />
                  <View style={styles.stopBody}>
                    <Text style={[styles.stopName, index === 0 ? styles.stopNameActive : null]}>{row.stationName}</Text>
                    {index === 0 ? (
                      <View style={styles.stopMetaRow}>
                        <Text style={styles.stopEtaChip}>⟳ {row.etaMinutes} min</Text>
                        <Pressable
                          onPress={toggleNotificationsEnabled}
                          style={({ pressed }) => [
                            styles.notifyToggle,
                            notificationsEnabled ? styles.notifyToggleOn : styles.notifyToggleOff,
                            pressed ? styles.notifyTogglePressed : null
                          ]}
                          accessibilityLabel="Toggle notify"
                        >
                          <Text
                            style={[
                              styles.notifyToggleText,
                              notificationsEnabled ? styles.notifyToggleTextOn : styles.notifyToggleTextOff
                            ]}
                          >
                            {notificationsEnabled ? '🔔 Notify on' : '🔕 Notify off'}
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.stopEtaSub}>{row.statusLabel}</Text>
                    )}
                  </View>
                  <Text style={styles.stopEta}>
                    {row.etaMinutes}m
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
              placeholderTextColor={colors.ink3}
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

        <View style={styles.sheetFooterRow}>
          <Pressable
            onPress={toggleBusDetail}
            accessibilityLabel="Start"
            style={({ pressed }) => [
              styles.startButton,
              pressed ? styles.startButtonPressed : null
            ]}
          >
            <Text style={styles.startButtonText}>Start</Text>
          </Pressable>

          <View style={styles.footerRightGroup}>
            <Pressable
              onPress={cycleWakeAlert}
              accessibilityLabel="Live location"
              style={({ pressed }) => [
                styles.liveLocationButton,
                pressed ? styles.liveLocationButtonPressed : null
              ]}
            >
              <Animated.View
                style={[styles.livePulseDot, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]}
              />
              <Text style={styles.liveLocationText}>Live</Text>
            </Pressable>

            <Pressable
              onPress={toggleFeedbackSheet}
              accessibilityLabel="Open feedback"
              style={({ pressed }) => [
                styles.chatButton,
                pressed ? styles.chatButtonPressed : null
              ]}
            >
              <Text style={styles.chatButtonText}>💬</Text>
            </Pressable>
          </View>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>

      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Loading live bus tracking...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg
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
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    ...shadow.sm
  },
  searchIcon: {
    color: colors.blue,
    fontSize: 22,
    lineHeight: 24,
    fontFamily: typography.fontBody
  },
  searchText: {
    flex: 1,
    color: colors.ink3,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: typography.fontBody
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
    fontFamily: typography.fontBody
  },
  searchResultPanel: {
    marginTop: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.sm
  },
  searchResultItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMd
  },
  searchResultName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  searchResultCoords: {
    marginTop: 2,
    color: colors.ink3,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  emptySearchText: {
    color: colors.ink3,
    fontSize: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontBody
  },
  offlineBadge: {
    backgroundColor: colors.surface2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5
  },
  offlineBadgeText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    fontFamily: typography.fontBody
  },
  stationSheet: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.lg
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.ink4,
    marginBottom: spacing.xs
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.s14
  },
  sheetTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1
  },
  sheetRouteTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    fontFamily: typography.fontDisplay,
    flexShrink: 1
  },
  lineBadge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    backgroundColor: colors.blueBg,
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  lineBadgeText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontDisplay
  },
  sheetIconGroup: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  sheetIconButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.borderMd,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm
  },
  sheetIconGlyph: {
    color: colors.ink3,
    fontSize: 12,
    fontFamily: typography.fontBody
  },
  caveatBanner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 268,
    borderRadius: radii.md,
    backgroundColor: colors.amberBg,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2
  },
  alertBanner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 328,
    borderRadius: radii.md,
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4
  },
  alertTitle: {
    color: colors.green,
    fontWeight: '800',
    fontSize: 12,
    fontFamily: typography.fontDisplay
  },
  alertBody: {
    color: colors.ink2,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: typography.fontBody
  },
  alertDismiss: {
    alignSelf: 'flex-start',
    marginTop: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2
  },
  alertDismissText: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  caveatTitle: {
    color: colors.amber,
    fontWeight: '800',
    fontSize: 12,
    fontFamily: typography.fontDisplay
  },
  caveatBody: {
    color: colors.ink2,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: typography.fontBody
  },
  stationName: {
    color: colors.ink,
    fontSize: 29,
    lineHeight: 32,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  stationCoords: {
    marginTop: -2,
    color: colors.ink3,
    fontSize: 12,
    fontFamily: typography.fontBody
  },
  etaList: {
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  etaCard: {
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  etaCardPrimary: {
    backgroundColor: colors.greenBg,
    borderColor: colors.greenBorder
  },
  etaLeft: {
    gap: 2
  },
  busCode: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  routeLabel: {
    color: colors.ink3,
    fontSize: 11,
    fontFamily: typography.fontBody
  },
  fallbackText: {
    color: colors.amber,
    fontSize: 10,
    marginTop: 2,
    fontFamily: typography.fontBody
  },
  etaRight: {
    alignItems: 'flex-end'
  },
  etaMinutes: {
    color: colors.green,
    fontSize: 31,
    lineHeight: 30,
    fontWeight: '900',
    fontFamily: typography.fontDisplay
  },
  etaUnits: {
    color: colors.ink3,
    fontSize: 10,
    marginTop: 2,
    fontFamily: typography.fontBody
  },
  liveTag: {
    color: colors.green,
    fontSize: 10,
    marginTop: 2,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  wakeButton: {
    marginTop: spacing.xs,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    justifyContent: 'center',
    paddingHorizontal: spacing.md
  },
  wakeButtonText: {
    color: colors.green,
    fontWeight: '800',
    fontSize: 13,
    fontFamily: typography.fontBody
  },
  wakeHintText: {
    marginTop: 2,
    color: colors.ink2,
    fontSize: 10,
    lineHeight: 12,
    fontFamily: typography.fontBody
  },
  prefPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 6
  },
  prefTitle: {
    color: colors.ink2,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontFamily: typography.fontDisplay
  },
  prefRow: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  prefChip: {
    flex: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: spacing.xs
  },
  prefChipLabel: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: typography.fontBody
  },
  accountPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
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
    color: colors.ink2,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  accountStatus: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fontBody
  },
  accountMeta: {
    color: colors.ink3,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  accountActionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 2
  },
  accountButton: {
    flex: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    backgroundColor: colors.blueBg,
    paddingVertical: 6,
    alignItems: 'center'
  },
  accountButtonText: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fontBody
  },
  accountButtonSecondary: {
    flex: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    alignItems: 'center'
  },
  accountButtonSecondaryText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  metaRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm
  },
  metaTextLeft: {
    color: colors.ink3,
    fontSize: 11,
    flex: 1,
    fontFamily: typography.fontBody
  },
  metaTextRight: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    fontFamily: typography.fontBody
  },
  detailButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    gap: 2
  },
  detailButtonText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  detailButtonHint: {
    color: colors.ink3,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  feedbackEntryButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    backgroundColor: colors.blueBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    gap: 2
  },
  feedbackEntryButtonText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  feedbackEntryHint: {
    color: colors.ink3,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  sheetFooterRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.s14,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  startButton: {
    borderRadius: 24,
    backgroundColor: colors.amber,
    paddingHorizontal: 28,
    paddingVertical: 12,
    ...shadow.md
  },
  startButtonPressed: {
    opacity: 0.9
  },
  startButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.fontDisplay
  },
  footerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  liveLocationButton: {
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.borderMd,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.s14,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    ...shadow.sm
  },
  liveLocationButtonPressed: {
    opacity: 0.9
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.green
  },
  liveLocationText: {
    color: colors.ink2,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.fontBody
  },
  chatButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.borderMd,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm
  },
  chatButtonPressed: {
    opacity: 0.9
  },
  chatButtonText: {
    color: colors.ink3,
    fontSize: 13,
    fontFamily: typography.fontBody
  },
  detailPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg,
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
    color: colors.green,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  detailTag: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fontBody
  },
  detailCoords: {
    color: colors.ink2,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.green
  },
  progressLabel: {
    color: colors.ink2,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: typography.fontBody
  },
  stopList: {
    gap: spacing.xs,
    position: 'relative',
    paddingLeft: 4
  },
  stopTimelineLine: {
    position: 'absolute',
    left: 10,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: colors.blueLine,
    opacity: 0.4
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s14,
    zIndex: 1
  },
  stopDot: {
    marginTop: 3,
    borderRadius: radii.full,
    borderWidth: 2.5,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
    zIndex: 2
  },
  stopDotInactive: {
    width: 10,
    height: 10,
    borderColor: colors.ink4
  },
  stopDotActive: {
    width: 12,
    height: 12,
    backgroundColor: colors.blue,
    borderColor: colors.surface
  },
  stopBody: {
    flex: 1,
    gap: 4
  },
  stopName: {
    color: colors.ink,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  stopNameActive: {
    fontWeight: '700'
  },
  stopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap'
  },
  stopEtaChip: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg,
    color: colors.green,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    fontFamily: typography.fontBody
  },
  notifyToggle: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2
  },
  notifyToggleOn: {
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg
  },
  notifyToggleOff: {
    borderColor: colors.borderMd,
    backgroundColor: colors.surface2
  },
  notifyTogglePressed: {
    opacity: 0.92
  },
  notifyToggleText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: typography.fontBody
  },
  notifyToggleTextOn: {
    color: colors.green
  },
  notifyToggleTextOff: {
    color: colors.ink3
  },
  stopEtaSub: {
    color: colors.ink4,
    fontSize: 9,
    fontFamily: typography.fontBody
  },
  stopEta: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  feedbackPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    backgroundColor: colors.blueBg,
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
    color: colors.blue,
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
    fontFamily: typography.fontDisplay
  },
  feedbackCategoryChip: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  feedbackCategoryText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  feedbackInput: {
    minHeight: 70,
    maxHeight: 110,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 12,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontFamily: typography.fontBody
  },
  feedbackSubmitButton: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    backgroundColor: colors.surface,
    paddingVertical: 7,
    alignItems: 'center'
  },
  feedbackSubmitDisabled: {
    opacity: 0.65
  },
  feedbackSubmitText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.fontBody
  },
  feedbackBanner: {
    color: colors.ink2,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: typography.fontBody
  },
  deltaRow: {
    marginTop: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: 2
  },
  deltaLabel: {
    color: colors.blue,
    fontSize: 10,
    letterSpacing: 0.4,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  deltaValue: {
    color: colors.ink2,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: typography.fontBody
  },
  errorText: {
    color: colors.amber,
    fontSize: 12,
    fontFamily: typography.fontBody
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    gap: spacing.sm
  },
  loadingText: {
    color: colors.ink,
    fontWeight: '700',
    fontFamily: typography.fontBody
  }
});
