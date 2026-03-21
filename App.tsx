import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdminFleetOverviewScreen } from './src/features/admin/fleet-overview/AdminFleetOverviewScreen';
import { LiveTrackingMapScreen } from './src/features/commuter/live-tracking-map/LiveTrackingMapScreen';
import { OfflineFirstHomeScreen } from './src/features/commuter/offline-launch/OfflineFirstHomeScreen';
import { DriverTripControlScreen } from './src/features/driver/trip-control/DriverTripControlScreen';
import { colors, radii, spacing, typography } from './src/shared/theme/tokens';

type Role = 'commuter' | 'driver';
type CommuterTab = 'home' | 'map' | 'routes' | 'profile';
type DriverTab = 'home' | 'map' | 'routes' | 'profile';
type AdminRole = 'super-admin' | 'monitor';

const DRIVER_CREDENTIALS: Record<string, string> = {
  'DRV-4821': '482193',
  'DRV-2198': '219845'
};

const ADMIN_CREDENTIALS: Record<AdminRole, { email: string; password: string }> = {
  'super-admin': { email: 'ops.super@bustrack.ph', password: 'Admin@123' },
  monitor: { email: 'ops.monitor@bustrack.ph', password: 'Monitor@123' }
};

const DRIVER_ROUTES = ['Manaoag - Dagupan', 'Dagupan - Manaoag', 'Express Terminal Loop'];

export default function App() {
  const [selectedRole, setSelectedRole] = useState<Role>('commuter');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [commuterTab, setCommuterTab] = useState<CommuterTab>('home');
  const [driverTab, setDriverTab] = useState<DriverTab>('home');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginSecret, setLoginSecret] = useState('');
  const [loginError, setLoginError] = useState('');
  const [driverFailedAttempts, setDriverFailedAttempts] = useState(0);
  const [driverLockUntil, setDriverLockUntil] = useState<number | null>(null);
  const [selectedDriverRoute, setSelectedDriverRoute] = useState('');
  const [checkVehicleReady, setCheckVehicleReady] = useState(false);
  const [checkRouteVerified, setCheckRouteVerified] = useState(false);
  const [checkGpsReady, setCheckGpsReady] = useState(false);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole>('monitor');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminTotp, setAdminTotp] = useState('');
  const [adminError, setAdminError] = useState('');

  const isWeb = Platform.OS === 'web';

  const signOut = () => {
    setIsAuthenticated(false);
    setLoginIdentifier('');
    setLoginSecret('');
    setLoginError('');
    setSelectedDriverRoute('');
    setCheckVehicleReady(false);
    setCheckRouteVerified(false);
    setCheckGpsReady(false);
  };

  const handleMobileLogin = () => {
    setLoginError('');

    if (!loginIdentifier.trim() || !loginSecret.trim()) {
      setLoginError('Enter credentials to continue.');
      return;
    }

    if (selectedRole === 'driver') {
      if (driverLockUntil && Date.now() < driverLockUntil) {
        const minsLeft = Math.ceil((driverLockUntil - Date.now()) / 60000);
        setLoginError(`Account locked. Try again in ${minsLeft} minute(s).`);
        return;
      }

      const expectedPin = DRIVER_CREDENTIALS[loginIdentifier.trim()];
      const valid = Boolean(expectedPin) && expectedPin === loginSecret.trim();

      if (!valid) {
        const nextAttempts = driverFailedAttempts + 1;
        setDriverFailedAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          setDriverLockUntil(Date.now() + 15 * 60 * 1000);
          setLoginError('Too many failed attempts. Driver login locked for 15 minutes.');
          return;
        }
        setLoginError(`Invalid driver credentials. Attempts: ${nextAttempts}/5.`);
        return;
      }

      setDriverFailedAttempts(0);
      setDriverLockUntil(null);
    }

    setIsAuthenticated(true);
    setCommuterTab('home');
    setDriverTab('home');
  };

  const handleAdminLogin = () => {
    setAdminError('');
    const selected = ADMIN_CREDENTIALS[adminRole];

    if (adminEmail.trim() !== selected.email || adminPassword.trim() !== selected.password) {
      setAdminError('Invalid admin email or password.');
      return;
    }

    if (adminRole === 'super-admin' && adminTotp.trim().length !== 6) {
      setAdminError('Super Admin requires 6-digit MFA code.');
      return;
    }

    setIsAdminAuthenticated(true);
  };

  const canContinuePreShift = checkVehicleReady && checkRouteVerified && checkGpsReady;

  if (isWeb) {
    if (!isAdminAuthenticated) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="dark" />
          <View style={styles.webLoginRoot}>
            <View style={styles.webLoginCard}>
              <Text style={styles.webLoginTitle}>BusTrack PH Admin</Text>
              <Text style={styles.webLoginSubtitle}>LGU operations portal with role-based access</Text>

              <View style={styles.roleToggleRow}>
                <Pressable
                  style={[styles.roleButton, adminRole === 'monitor' ? styles.roleButtonActiveCommuter : null]}
                  onPress={() => setAdminRole('monitor')}
                >
                  <Text style={[styles.roleButtonText, adminRole === 'monitor' ? styles.roleButtonTextActiveCommuter : null]}>
                    Monitor
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.roleButton, adminRole === 'super-admin' ? styles.roleButtonActiveDriver : null]}
                  onPress={() => setAdminRole('super-admin')}
                >
                  <Text style={[styles.roleButtonText, adminRole === 'super-admin' ? styles.roleButtonTextActiveDriver : null]}>
                    Super Admin
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Admin Email</Text>
              <TextInput
                value={adminEmail}
                onChangeText={setAdminEmail}
                placeholder="ops.monitor@bustrack.ph"
                placeholderTextColor={colors.ink4}
                style={styles.inputField}
              />

              <Text style={[styles.inputLabel, styles.inputLabelGap]}>Password</Text>
              <TextInput
                value={adminPassword}
                onChangeText={setAdminPassword}
                placeholder="********"
                placeholderTextColor={colors.ink4}
                secureTextEntry
                style={styles.inputField}
              />

              {adminRole === 'super-admin' ? (
                <>
                  <Text style={[styles.inputLabel, styles.inputLabelGap]}>MFA Code (TOTP)</Text>
                  <TextInput
                    value={adminTotp}
                    onChangeText={setAdminTotp}
                    placeholder="123456"
                    placeholderTextColor={colors.ink4}
                    maxLength={6}
                    keyboardType="number-pad"
                    style={styles.inputField}
                  />
                </>
              ) : null}

              {adminError ? <Text style={styles.errorText}>{adminError}</Text> : null}

              <Pressable style={[styles.loginButton, styles.loginButtonCommuter]} onPress={handleAdminLogin}>
                <Text style={styles.loginButtonText}>Sign In to Admin Dashboard</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.webHeader}>
          <Text style={styles.webHeaderTitle}>Mapandan e-Bus Admin Web Portal</Text>
          <Text style={styles.webHeaderMeta}>Operations dashboard for dispatch and THC handover control ({adminRole})</Text>
          <Pressable
            style={styles.webSignOutButton}
            onPress={() => {
              setIsAdminAuthenticated(false);
              setAdminPassword('');
              setAdminTotp('');
            }}
          >
            <Text style={styles.webSignOutButtonText}>Sign Out</Text>
          </Pressable>
        </View>
        <View style={styles.content}>
          <AdminFleetOverviewScreen />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loginRoot}>
          <View style={[styles.loginHero, selectedRole === 'driver' ? styles.loginHeroDriver : styles.loginHeroCommuter]}>
            <View style={styles.loginBrandMark}>
              <Text style={styles.loginBrandMarkText}>{selectedRole === 'driver' ? 'D' : 'C'}</Text>
            </View>
            <Text style={styles.loginBrandTitle}>{selectedRole === 'driver' ? 'TransitOps' : 'TransitGo'}</Text>
            <Text style={styles.loginBrandSubtitle}>
              {selectedRole === 'driver' ? 'Driver Portal 2026' : 'Commuter Portal 2026'}
            </Text>
          </View>

          <View style={styles.loginPanel}>
            <Text style={styles.loginPanelTitle}>Welcome back</Text>
            <Text style={styles.loginPanelSubtitle}>Choose role and sign in to continue</Text>

            <View style={styles.roleToggleRow}>
              <Pressable
                style={[styles.roleButton, selectedRole === 'driver' ? styles.roleButtonActiveDriver : null]}
                onPress={() => setSelectedRole('driver')}
              >
                <Text style={[styles.roleButtonText, selectedRole === 'driver' ? styles.roleButtonTextActiveDriver : null]}>Driver</Text>
              </Pressable>
              <Pressable
                style={[styles.roleButton, selectedRole === 'commuter' ? styles.roleButtonActiveCommuter : null]}
                onPress={() => setSelectedRole('commuter')}
              >
                <Text style={[styles.roleButtonText, selectedRole === 'commuter' ? styles.roleButtonTextActiveCommuter : null]}>Commuter</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>{selectedRole === 'driver' ? 'Employee ID' : 'Email or phone'}</Text>
            <TextInput
              value={loginIdentifier}
              onChangeText={setLoginIdentifier}
              placeholder={selectedRole === 'driver' ? 'DRV-4821' : 'you@example.com'}
              placeholderTextColor={colors.ink4}
              style={styles.inputField}
            />

            <Text style={[styles.inputLabel, styles.inputLabelGap]}>PIN / Password</Text>
            <TextInput
              value={loginSecret}
              onChangeText={setLoginSecret}
              placeholder="********"
              placeholderTextColor={colors.ink4}
              secureTextEntry
              style={styles.inputField}
            />

            <Pressable
              style={[styles.loginButton, selectedRole === 'driver' ? styles.loginButtonDriver : styles.loginButtonCommuter]}
              onPress={handleMobileLogin}
            >
              <Text style={styles.loginButtonText}>Sign In</Text>
            </Pressable>

            {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

            {selectedRole === 'driver' ? (
              <Text style={styles.loginHint}>Demo driver accounts: DRV-4821 / 482193, DRV-2198 / 219845</Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedRole === 'driver' && !selectedDriverRoute) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.onboardingRoot}>
          <View style={styles.profileCard}>
            <Text style={styles.profileTitle}>Select Route</Text>
            <Text style={styles.profileSubtitle}>P0 Driver flow: assign a route before starting shift.</Text>
            {DRIVER_ROUTES.map((route) => (
              <Pressable
                key={route}
                style={[styles.listRow, selectedDriverRoute === route ? styles.selectedRow : null]}
                onPress={() => setSelectedDriverRoute(route)}
              >
                <Text style={styles.listMain}>{route}</Text>
                <Text style={[styles.listMeta, selectedDriverRoute === route ? styles.selectedRowText : null]}>
                  {selectedDriverRoute === route ? 'Selected' : 'Tap to choose'}
                </Text>
              </Pressable>
            ))}
            <Pressable style={[styles.loginButton, styles.loginButtonDriver]} disabled={!selectedDriverRoute}>
              <Text style={styles.loginButtonText}>Route Confirmed</Text>
            </Pressable>
            <Pressable style={styles.signOutButton} onPress={signOut}>
              <Text style={styles.signOutButtonText}>Back to Login</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedRole === 'driver' && !canContinuePreShift) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.onboardingRoot}>
          <View style={styles.profileCard}>
            <Text style={styles.profileTitle}>Pre-Shift Checklist</Text>
            <Text style={styles.profileSubtitle}>P1 flow for data integrity before GPS broadcast starts.</Text>
            <View style={styles.listRow}>
              <Text style={styles.listMain}>Route</Text>
              <Text style={[styles.listMeta, { color: colors.green }]}>{selectedDriverRoute}</Text>
            </View>
            <Pressable style={styles.listRow} onPress={() => setCheckVehicleReady((v) => !v)}>
              <Text style={styles.listMain}>Vehicle ID verified</Text>
              <Text style={[styles.listMeta, checkVehicleReady ? styles.selectedRowText : null]}>
                {checkVehicleReady ? 'Done' : 'Pending'}
              </Text>
            </Pressable>
            <Pressable style={styles.listRow} onPress={() => setCheckRouteVerified((v) => !v)}>
              <Text style={styles.listMain}>Route assignment reviewed</Text>
              <Text style={[styles.listMeta, checkRouteVerified ? styles.selectedRowText : null]}>
                {checkRouteVerified ? 'Done' : 'Pending'}
              </Text>
            </Pressable>
            <Pressable style={styles.listRow} onPress={() => setCheckGpsReady((v) => !v)}>
              <Text style={styles.listMain}>GPS lock confirmed</Text>
              <Text style={[styles.listMeta, checkGpsReady ? styles.selectedRowText : null]}>
                {checkGpsReady ? 'Done' : 'Pending'}
              </Text>
            </Pressable>
            {!canContinuePreShift ? <Text style={styles.loginHint}>Complete all checks to continue.</Text> : null}
            <Pressable
              style={[styles.loginButton, styles.loginButtonDriver, !canContinuePreShift ? styles.disabledButton : null]}
              disabled={!canContinuePreShift}
            >
              <Text style={styles.loginButtonText}>Continue to Shift</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const headerTitle =
    selectedRole === 'driver'
      ? driverTab === 'home'
        ? 'Driver Home'
        : driverTab === 'map'
        ? 'Live Map'
        : driverTab === 'routes'
        ? 'My Schedule'
        : 'Profile'
      : commuterTab === 'home'
      ? 'Commuter Home'
      : commuterTab === 'map'
      ? 'Live Map'
      : commuterTab === 'routes'
      ? 'Routes'
      : 'Profile';

  const renderCommuterContent = () => {
    if (commuterTab === 'map') {
      return <LiveTrackingMapScreen />;
    }
    if (commuterTab === 'routes') {
      return (
        <View style={styles.profileCard}>
          <Text style={styles.profileTitle}>My Routes</Text>
          <Text style={styles.profileSubtitle}>Favorite and recent commute routes</Text>
          <View style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listMain}>Makati Central → BGC</Text>
              <Text style={styles.listMeta}>15 min • 8.2 km</Text>
            </View>
            <Text style={[styles.listMeta, { color: colors.green }]}>Saved</Text>
          </View>
          <View style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listMain}>Home → Office</Text>
              <Text style={styles.listMeta}>28 min • 12.5 km</Text>
            </View>
            <Text style={[styles.listMeta, { color: colors.green }]}>Saved</Text>
          </View>
          <View style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listMain}>Greenbelt → QC</Text>
              <Text style={styles.listMeta}>18 min • 9.1 km</Text>
            </View>
          </View>
        </View>
      );
    }
    if (commuterTab === 'profile') {
      return (
        <View style={styles.profileCard}>
          <Text style={styles.profileTitle}>Sofia C.</Text>
          <Text style={styles.profileSubtitle}>Commuter profile and preferences</Text>
          <View style={styles.profileStatsRow}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatLabel}>Trips</Text>
              <Text style={styles.profileStatValue}>248</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatLabel}>Saved</Text>
              <Text style={styles.profileStatValue}>₱214</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatLabel}>Trees</Text>
              <Text style={styles.profileStatValue}>41</Text>
            </View>
          </View>
          <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
            <View style={styles.listRow}>
              <Text style={styles.listMain}>📧 Email notifications</Text>
              <Text style={[styles.listMeta, { color: colors.green }]}>On</Text>
            </View>
            <View style={styles.listRow}>
              <Text style={styles.listMain}>🔔 SMS alerts</Text>
              <Text style={[styles.listMeta, { color: colors.ink4 }]}>Off</Text>
            </View>
          </View>
          <Pressable
            style={styles.signOutButton}
            onPress={signOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </Pressable>
        </View>
      );
    }
    return <OfflineFirstHomeScreen />;
  };

  const renderDriverContent = () => {
    if (driverTab === 'map') {
      return (
        <View style={styles.profileCard}>
          <Text style={styles.profileTitle}>Live Map</Text>
          <Text style={styles.profileSubtitle}>Real-time tracking and route visualization</Text>
          <View style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listMain}>Live Status</Text>
              <Text style={styles.listMeta}>Route H16 • 12 stops</Text>
            </View>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green }} />
          </View>
          <View style={styles.listRow}>
            <Text style={styles.listMain}>Current Speed</Text>
            <Text style={[styles.listMeta, { fontWeight: '700', color: colors.ink }]}>42 km/h</Text>
          </View>
          <View style={styles.listRow}>
            <Text style={styles.listMain}>Passengers</Text>
            <Text style={[styles.listMeta, { fontWeight: '700', color: colors.ink }]}>34 / 45</Text>
          </View>
          <Pressable style={styles.ctaButton} onPress={() => setDriverTab('home')}>
            <Text style={styles.ctaButtonText}>Open Trip Controls</Text>
          </Pressable>
        </View>
      );
    }
    if (driverTab === 'routes') {
      return (
        <View style={styles.profileCard}>
          <Text style={styles.profileTitle}>My Schedule</Text>
          <Text style={styles.profileSubtitle}>Active and upcoming trips for this shift</Text>
          <View style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listMain}>H16 - Active Route</Text>
              <Text style={styles.listMeta}>14 stops • 8:30 AM - 4:30 PM</Text>
            </View>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green }} />
          </View>
          <View style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listMain}>H16 - Return Route</Text>
              <Text style={styles.listMeta}>12 stops • 4:40 PM - 10:00 PM</Text>
            </View>
          </View>
          <View style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listMain}>Break Time</Text>
              <Text style={styles.listMeta}>12:00 PM - 1:00 PM</Text>
            </View>
          </View>
        </View>
      );
    }
    if (driverTab === 'profile') {
      return (
        <View style={styles.profileCard}>
          <Text style={styles.profileTitle}>Rodrigo M.</Text>
          <Text style={styles.profileSubtitle}>Driver profile and shift settings</Text>
          <View style={styles.profileStatsRow}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatLabel}>Rating</Text>
              <Text style={styles.profileStatValue}>4.9</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatLabel}>Trips</Text>
              <Text style={styles.profileStatValue}>1.2k</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatLabel}>Years</Text>
              <Text style={styles.profileStatValue}>4.5</Text>
            </View>
          </View>
          <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
            <View style={styles.listRow}>
              <Text style={styles.listMain}>🏠 Depot Location</Text>
              <Text style={[styles.listMeta, { color: colors.ink }]}>Makati Central</Text>
            </View>
            <View style={styles.listRow}>
              <Text style={styles.listMain}>⏰ Shift Start</Text>
              <Text style={[styles.listMeta, { color: colors.ink }]}>8:30 AM</Text>
            </View>
            <View style={styles.listRow}>
              <Text style={styles.listMain}>✓ License Valid</Text>
              <Text style={[styles.listMeta, { color: colors.green }]}>Yes (until 2027)</Text>
            </View>
          </View>
          <Pressable
            style={styles.signOutButton}
            onPress={signOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </Pressable>
        </View>
      );
    }
    return <DriverTripControlScreen />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.appTopbar}>
        <Text style={styles.appTopbarTitle}>{headerTitle}</Text>
        <View style={[styles.roleChip, selectedRole === 'driver' ? styles.roleChipDriver : styles.roleChipCommuter]}>
          <Text style={[styles.roleChipText, selectedRole === 'driver' ? styles.roleChipTextDriver : styles.roleChipTextCommuter]}>
            {selectedRole === 'driver' ? 'Driver' : 'Commuter'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>{selectedRole === 'driver' ? renderDriverContent() : renderCommuterContent()}</View>

      <View style={styles.tabbar}>
        <Pressable
          style={[styles.tabItem, (selectedRole === 'driver' ? driverTab : commuterTab) === 'home' ? styles.tabItemActive : null]}
          onPress={() => {
            if (selectedRole === 'driver') {
              setDriverTab('home');
            } else {
              setCommuterTab('home');
            }
          }}
        >
          <Text style={[styles.tabLabel, (selectedRole === 'driver' ? driverTab : commuterTab) === 'home' ? styles.tabLabelActive : null]}>Home</Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, (selectedRole === 'driver' ? driverTab : commuterTab) === 'map' ? styles.tabItemActive : null]}
          onPress={() => {
            if (selectedRole === 'driver') {
              setDriverTab('map');
            } else {
              setCommuterTab('map');
            }
          }}
        >
          <Text style={[styles.tabLabel, (selectedRole === 'driver' ? driverTab : commuterTab) === 'map' ? styles.tabLabelActive : null]}>Map</Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, (selectedRole === 'driver' ? driverTab : commuterTab) === 'routes' ? styles.tabItemActive : null]}
          onPress={() => {
            if (selectedRole === 'driver') {
              setDriverTab('routes');
            } else {
              setCommuterTab('routes');
            }
          }}
        >
          <Text style={[styles.tabLabel, (selectedRole === 'driver' ? driverTab : commuterTab) === 'routes' ? styles.tabLabelActive : null]}>
            {selectedRole === 'driver' ? 'Schedule' : 'Routes'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, (selectedRole === 'driver' ? driverTab : commuterTab) === 'profile' ? styles.tabItemActive : null]}
          onPress={() => {
            if (selectedRole === 'driver') {
              setDriverTab('profile');
            } else {
              setCommuterTab('profile');
            }
          }}
        >
          <Text style={[styles.tabLabel, (selectedRole === 'driver' ? driverTab : commuterTab) === 'profile' ? styles.tabLabelActive : null]}>Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg
  },
  loginRoot: {
    flex: 1,
    backgroundColor: colors.ink
  },
  loginHero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg
  },
  loginHeroDriver: {
    backgroundColor: colors.ink
  },
  loginHeroCommuter: {
    backgroundColor: colors.blue
  },
  loginBrandMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }
  },
  loginBrandMarkText: {
    color: colors.surface,
    fontSize: 26,
    fontWeight: '900',
    fontFamily: typography.fontDisplay
  },
  loginBrandTitle: {
    color: colors.surface,
    fontSize: 32,
    fontWeight: '900',
    fontFamily: typography.fontDisplay,
    letterSpacing: -0.5
  },
  loginBrandSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: typography.fontBody
  },
  loginPanel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 }
  },
  loginPanelTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: typography.fontDisplay
  },
  loginPanelSubtitle: {
    color: colors.ink3,
    fontSize: 11,
    marginTop: 2,
    marginBottom: spacing.md,
    fontFamily: typography.fontBody,
    letterSpacing: 0.3
  },
  roleToggleRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg
  },
  roleButton: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingVertical: 12,
    alignItems: 'center',
    opacity: 0.65
  },
  roleButtonActiveDriver: {
    borderColor: colors.green,
    backgroundColor: colors.greenBg,
    opacity: 1
  },
  roleButtonActiveCommuter: {
    borderColor: colors.blue,
    backgroundColor: colors.blueBg,
    opacity: 1
  },
  roleButtonText: {
    color: colors.ink3,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontFamily: typography.fontBody
  },
  roleButtonTextActiveDriver: {
    color: colors.green,
    fontWeight: '800'
  },
  roleButtonTextActiveCommuter: {
    color: colors.blue,
    fontWeight: '800'
  },
  inputLabel: {
    color: colors.ink3,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: typography.fontBody
  },
  inputLabelGap: {
    marginTop: spacing.md
  },
  inputField: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'rgba(249, 247, 244, 0.4)',
    color: colors.ink,
    fontSize: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    fontFamily: typography.fontBody
  },
  loginButton: {
    marginTop: spacing.lg,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center'
  },
  loginButtonDriver: {
    backgroundColor: colors.green
  },
  loginButtonCommuter: {
    backgroundColor: colors.blue
  },
  loginButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
    fontFamily: typography.fontDisplay
  },
  loginHint: {
    marginTop: spacing.xs,
    color: colors.ink3,
    fontSize: 11,
    fontFamily: typography.fontBody
  },
  errorText: {
    marginTop: spacing.xs,
    color: colors.red,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  onboardingRoot: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.bg
  },
  selectedRow: {
    borderColor: colors.green,
    backgroundColor: colors.greenBg
  },
  selectedRowText: {
    color: colors.green,
    fontWeight: '800'
  },
  disabledButton: {
    opacity: 0.45
  },
  appTopbar: {
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }
  },
  appTopbarTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
    fontFamily: typography.fontDisplay,
    letterSpacing: -0.3
  },
  roleChip: {
    borderRadius: radii.full,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  roleChipDriver: {
    borderColor: colors.green,
    backgroundColor: colors.greenBg
  },
  roleChipCommuter: {
    borderColor: colors.blue,
    backgroundColor: colors.blueBg
  },
  roleChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: typography.fontBody
  },
  roleChipTextDriver: {
    color: colors.green
  },
  roleChipTextCommuter: {
    color: colors.blue
  },
  webHeader: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: 6,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderMd,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.s10,
    gap: 3
  },
  webSignOutButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.redBorder,
    backgroundColor: colors.redBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  webSignOutButtonText: {
    color: colors.red,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fontBody
  },
  webLoginRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.bg
  },
  webLoginCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.xs
  },
  webLoginTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    fontFamily: typography.fontDisplay
  },
  webLoginSubtitle: {
    color: colors.ink2,
    fontSize: 12,
    marginBottom: spacing.sm,
    fontFamily: typography.fontBody
  },
  webHeaderTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  webHeaderMeta: {
    color: colors.ink2,
    fontSize: 11,
    fontFamily: typography.fontBody
  },
  tabbar: {
    flexDirection: 'row',
    height: 72,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 0,
    paddingBottom: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 }
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 3,
    borderTopColor: 'transparent'
  },
  tabItemActive: {
    borderTopColor: colors.amber
  },
  tabLabel: {
    color: colors.ink3,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    fontFamily: typography.fontBody
  },
  tabLabelActive: {
    color: colors.amber,
    fontWeight: '900',
    fontSize: 11,
    fontFamily: typography.fontDisplay
  },
  content: {
    flex: 1,
    backgroundColor: colors.bg,
    overflow: 'hidden'
  },
  profileCard: {
    margin: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }
  },
  profileTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: typography.fontDisplay,
    letterSpacing: -0.3
  },
  profileSubtitle: {
    color: colors.ink3,
    fontSize: 11,
    fontFamily: typography.fontBody,
    letterSpacing: 0.2
  },
  profileStatsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.xs
  },
  profileStat: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingVertical: spacing.md,
    alignItems: 'center'
  },
  profileStatLabel: {
    color: colors.ink3,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: typography.fontBody
  },
  profileStatValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
    fontFamily: typography.fontDisplay
  },
  ctaButton: {
    borderRadius: radii.md,
    backgroundColor: colors.green,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.xs
  },
  ctaButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontFamily: typography.fontBody
  },
  listRow: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 11,
    marginVertical: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  listMain: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  listMeta: {
    color: colors.ink3,
    fontSize: 10,
    fontFamily: typography.fontBody,
    letterSpacing: 0.2
  },
  signOutButton: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.red,
    backgroundColor: colors.redBg,
    paddingVertical: 12,
    alignItems: 'center'
  },
  signOutButtonText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontFamily: typography.fontDisplay
  }
});
