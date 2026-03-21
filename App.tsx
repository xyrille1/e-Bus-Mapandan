import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { AdminFleetOverviewScreen } from './src/features/admin/fleet-overview/AdminFleetOverviewScreen';
import { LiveTrackingMapScreen } from './src/features/commuter/live-tracking-map/LiveTrackingMapScreen';
import { OfflineFirstHomeScreen } from './src/features/commuter/offline-launch/OfflineFirstHomeScreen';
import { DriverTripControlScreen } from './src/features/driver/trip-control/DriverTripControlScreen';
import { colors } from './src/shared/theme/tokens';

export default function App() {
  const [appMode, setAppMode] = useState<'commuter' | 'driver'>('commuter');
  const [commuterView, setCommuterView] = useState<'tracker' | 'board'>('tracker');
  const isWeb = Platform.OS === 'web';

  if (isWeb) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.webHeader}>
          <Text style={styles.webHeaderTitle}>Mapandan e-Bus Admin Web Portal</Text>
          <Text style={styles.webHeaderMeta}>Operations dashboard for dispatch and THC handover control</Text>
        </View>
        <View style={styles.content}>
          <AdminFleetOverviewScreen />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <View style={styles.modeSwitch}>
        <Pressable
          style={[styles.modeButton, appMode === 'commuter' ? styles.modeButtonActive : null]}
          onPress={() => setAppMode('commuter')}
        >
          <Text style={[styles.modeText, appMode === 'commuter' ? styles.modeTextActive : null]}>
            COMMUTER
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeButton, appMode === 'driver' ? styles.modeButtonActive : null]}
          onPress={() => setAppMode('driver')}
        >
          <Text style={[styles.modeText, appMode === 'driver' ? styles.modeTextActive : null]}>
            DRIVER
          </Text>
        </Pressable>
      </View>

      {appMode === 'commuter' ? (
        <View style={styles.subModeSwitch}>
          <Pressable
            style={[styles.subModeButton, commuterView === 'tracker' ? styles.subModeButtonActive : null]}
            onPress={() => setCommuterView('tracker')}
          >
            <Text style={[styles.subModeText, commuterView === 'tracker' ? styles.subModeTextActive : null]}>
              LIVE TRACKER
            </Text>
          </Pressable>
          <Pressable
            style={[styles.subModeButton, commuterView === 'board' ? styles.subModeButtonActive : null]}
            onPress={() => setCommuterView('board')}
          >
            <Text style={[styles.subModeText, commuterView === 'board' ? styles.subModeTextActive : null]}>
              OFFLINE BOARD
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.content}>
        {appMode === 'commuter' && commuterView === 'tracker' ? <LiveTrackingMapScreen /> : null}
        {appMode === 'commuter' && commuterView === 'board' ? <OfflineFirstHomeScreen /> : null}
        {appMode === 'driver' ? <DriverTripControlScreen /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#030a1d'
  },
  modeSwitch: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(72, 94, 153, 0.65)',
    backgroundColor: 'rgba(8, 19, 49, 0.86)',
    padding: 4,
    gap: 4
  },
  modeButton: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: 'center'
  },
  modeButtonActive: {
    backgroundColor: 'rgba(15, 205, 169, 0.2)'
  },
  modeText: {
    color: '#87a0d6',
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '700'
  },
  modeTextActive: {
    color: '#9ff8e8'
  },
  webHeader: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(86, 121, 196, 0.55)',
    backgroundColor: 'rgba(10, 24, 59, 0.86)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3
  },
  webHeaderTitle: {
    color: '#dbeafe',
    fontSize: 14,
    fontWeight: '800'
  },
  webHeaderMeta: {
    color: '#9fbae8',
    fontSize: 11
  },
  subModeSwitch: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 127, 173, 0.58)',
    backgroundColor: 'rgba(13, 33, 65, 0.7)',
    padding: 4,
    gap: 4
  },
  subModeButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center'
  },
  subModeButtonActive: {
    backgroundColor: 'rgba(90, 185, 255, 0.2)'
  },
  subModeText: {
    color: '#8caadf',
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '700'
  },
  subModeTextActive: {
    color: '#d7eeff'
  },
  content: {
    flex: 1,
    backgroundColor: colors.bgCanvas
  }
});
