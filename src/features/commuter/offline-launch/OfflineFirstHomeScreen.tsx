import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { StatusPill } from "../../../shared/components/StatusPill";
import { subscribeToBusPositions } from "../../../shared/supabase/busPositions";
import {
  colors,
  radii,
  shadow,
  spacing,
  typography,
} from "../../../shared/theme/tokens";

import {
  getCachedStations,
  getInitialBusSnapshot,
  routePolyline,
} from "../live-tracking-map/liveTrackingMock";
import type { BusSnapshot } from "../live-tracking-map/liveTrackingMock";
import { RouteMap } from "../live-tracking-map/RouteMap";
import { useOfflineBootstrap } from "./useOfflineBootstrap";

// Centred on Urdaneta Junction — midpoint of the Manaoag–Dagupan route.
const ROUTE_INITIAL_REGION = {
  latitude: 16.0673,
  longitude: 120.5369,
  latitudeDelta: 0.07,
  longitudeDelta: 0.07,
} as const;

function formatTime(isoTime: string): string {
  return new Date(isoTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OfflineFirstHomeScreen() {
  const { schedule, isSyncing, isOnline, errorMessage, statusTone } =
    useOfflineBootstrap();

  // Live bus position — starts at the route origin; updated via Supabase Realtime.
  const [liveBus, setLiveBus] = useState<BusSnapshot>(getInitialBusSnapshot);
  const cachedStations = useMemo(() => getCachedStations(), []);

  const arrivalAnim = useMemo(
    () => schedule.upcomingBuses.map(() => new Animated.Value(0)),
    [schedule.upcomingBuses.length],
  );
  const livePulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animations = arrivalAnim.map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 360,
        delay: 0,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );

    Animated.stagger(70, animations).start();
  }, [arrivalAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulseAnim, {
          toValue: 1,
          duration: 850,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(livePulseAnim, {
          toValue: 0,
          duration: 1150,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
      livePulseAnim.setValue(0);
    };
  }, [livePulseAnim]);

  // Subscribe to Supabase Realtime bus position updates.
  useEffect(() => subscribeToBusPositions(setLiveBus), []);

  const pulseScale = livePulseAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 1.28, 1],
  });
  const pulseOpacity = livePulseAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.92, 0.58, 0.92],
  });

  return (
    <View style={styles.root}>
      {isOnline === false ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerLabel}>⚠ Offline</Text>
          <Text style={styles.offlineBannerMeta}>
            Last synced {formatTime(schedule.lastSyncAt)}
          </Text>
        </View>
      ) : null}

      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconGlyph}>←</Text>
        </View>
        <Text style={styles.headerTitle}>Bus Station</Text>
        <View style={styles.iconCircle}>
          <Text style={styles.iconGlyph}>☆</Text>
        </View>
      </View>

      <View style={styles.headerCard}>
        <View style={styles.stopHeaderRow}>
          <View style={styles.stopTitleWrap}>
            <Text style={styles.stationName}>{schedule.stationName}</Text>
            <Text style={styles.stopId}>ID: 3320</Text>
          </View>
          <View style={styles.iconStack}>
            <View style={styles.sheetIconCircle}>
              <Text style={styles.iconGlyph}>⊞</Text>
            </View>
            <View style={styles.sheetIconCircle}>
              <Text style={styles.iconGlyph}>↓</Text>
            </View>
          </View>
        </View>

        <View style={styles.illustrationArea}>
          <RouteMap
            style={styles.mapInCard}
            initialRegion={ROUTE_INITIAL_REGION}
            routePolyline={routePolyline}
            bus={liveBus}
            filteredStations={cachedStations}
            selectedStation={cachedStations[0]!}
            selectStation={() => {}}
          />
        </View>

        <View style={styles.statusRow}>
          <StatusPill
            tone={statusTone}
            label={
              isSyncing
                ? "Syncing latest data"
                : errorMessage
                  ? "Offline mode"
                  : "Live updates connected"
            }
          />
          <Text style={styles.syncMeta}>
            Last sync {formatTime(schedule.lastSyncAt)}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>NEXT ARRIVALS</Text>

        <View style={styles.listWrap}>
          {schedule.upcomingBuses.map((item: string, index: number) => (
            <Animated.View
              key={item}
              style={[
                styles.listItem,
                {
                  opacity: arrivalAnim[index],
                  transform: [
                    {
                      translateY: arrivalAnim[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.arrivalLeft}>
                <View style={styles.lineBadge}>
                  <Text style={styles.lineBadgeText}>{item.split(" ")[0]}</Text>
                </View>
                <Text style={styles.listItemText}>{item}</Text>
              </View>
              <Text style={styles.arrivalTimeText}>Now</Text>
            </Animated.View>
          ))}
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>
            Estimated - Live data unavailable
          </Text>
          <Text style={styles.noticeText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.flexGap} />

      <View style={styles.bottomBar}>
        <Pressable style={styles.livePill} accessibilityLabel="Live location">
          <Animated.View
            style={[
              styles.liveDot,
              { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
            ]}
          />
          <Text style={styles.livePillText}>Live Location</Text>
        </Pressable>
        <Pressable style={styles.iconCircle} accessibilityLabel="Open chat">
          <Text style={styles.iconGlyph}>💬</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  headerRow: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: typography.fontDisplay,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.borderMd,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
  iconGlyph: {
    color: colors.ink3,
    fontSize: 14,
    fontFamily: typography.fontBody,
  },
  headerCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xxs,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.s18,
    ...shadow.md,
    gap: spacing.sm,
  },
  stopHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  stopTitleWrap: {
    flex: 1,
    maxWidth: 210,
  },
  stopId: {
    marginTop: spacing.xxs,
    fontSize: 11,
    fontWeight: "500",
    color: colors.ink4,
    fontFamily: typography.fontBody,
  },
  iconStack: {
    flexDirection: "column",
    gap: 6,
  },
  sheetIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderMd,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.amberBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.amberBorder,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.s10,
  },
  offlineBannerLabel: {
    color: colors.amber,
    fontSize: 13,
    fontWeight: "800",
    fontFamily: typography.fontDisplay,
  },
  offlineBannerMeta: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: "500",
    fontFamily: typography.fontBody,
  },
  illustrationArea: {
    height: 148,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapInCard: {
    width: "100%",
    height: 148,
  },
  statusRow: {
    gap: spacing.xs,
  },
  syncMeta: {
    color: colors.ink2,
    fontSize: 13,
    fontFamily: typography.fontBody,
  },
  sectionLabel: {
    color: colors.ink4,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
    fontFamily: typography.fontBody,
    marginTop: spacing.xs,
  },
  stationName: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    fontFamily: typography.fontDisplay,
  },
  listWrap: {
    marginTop: spacing.s10,
    gap: 7,
  },
  listItem: {
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.s10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.s10,
  },
  arrivalLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
  },
  lineBadge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    backgroundColor: colors.blueBg,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  lineBadgeText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: typography.fontDisplay,
  },
  listItemText: {
    color: colors.ink,
    fontWeight: "600",
    fontSize: 13,
    flex: 1,
    fontFamily: typography.fontBody,
  },
  arrivalTimeText: {
    color: colors.green,
    fontWeight: "700",
    fontSize: 12,
    fontFamily: typography.fontBody,
  },
  noticeCard: {
    borderRadius: radii.md,
    backgroundColor: colors.amberBg,
    borderColor: colors.amberBorder,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  noticeTitle: {
    color: colors.amber,
    fontWeight: "800",
    fontSize: 14,
    fontFamily: typography.fontDisplay,
  },
  noticeText: {
    color: colors.ink2,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.fontBody,
  },
  flexGap: {
    flex: 1,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingBottom: spacing.s10,
    paddingTop: spacing.s10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  livePill: {
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.borderMd,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.s18,
    paddingVertical: spacing.s10,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    ...shadow.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.green,
  },
  livePillText: {
    color: colors.ink2,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: typography.fontBody,
  },
});
