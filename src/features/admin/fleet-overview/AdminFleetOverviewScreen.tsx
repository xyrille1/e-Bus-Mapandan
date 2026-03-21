import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, shadow, spacing, typography } from '../../../shared/theme/tokens';

import { useAdminFleetOverview } from './useAdminFleetOverview';

function formatClock(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getStatusColor(status: 'Active' | 'Delayed' | 'Offline') {
  if (status === 'Delayed') {
    return colors.amber;
  }

  if (status === 'Offline') {
    return colors.red;
  }

  return colors.green;
}

export function AdminFleetOverviewScreen() {
  const isWeb = Platform.OS === 'web';
  const [activeNav, setActiveNav] = useState<
    'dashboard' | 'live-map' | 'routes' | 'bus-stops' | 'schedule' | 'alerts' | 'drivers' | 'vehicles' | 'reports' | 'settings'
  >('dashboard');

  const {
    rows,
    incidentQueue,
    alertsToday,
    avgWaitMins,
    activeTrips,
    lastUpdatedAt,
    fleetHealth,
    pendingIncidents,
    acknowledgeIncident,
    broadcastTarget,
    broadcastDraft,
    broadcastStatus,
    broadcastBanner,
    broadcastHistory,
    cycleBroadcastTarget,
    setBroadcastDraft,
    sendBroadcast,
    routeTrendSummary,
    dispatchMode,
    peakHourPolicy,
    autoRecoveryEnabled,
    policyBanner,
    cycleDispatchMode,
    cyclePeakHourPolicy,
    toggleAutoRecovery,
    reportStatus,
    reportBanner,
    lastReportSnapshot,
    generateDailyReportSnapshot,
    handoverNoteDraft,
    handoverStatus,
    handoverBanner,
    handoverHistory,
    setHandoverNoteDraft,
    saveHandoverNote,
    slaWaitThresholdMins,
    slaOtpThresholdPercent,
    slaBanner,
    cycleSlaWaitThreshold,
    cycleSlaOtpThreshold,
    slaBreaches,
    auditNoteDraft,
    auditStatus,
    auditBanner,
    auditEvents,
    setAuditNoteDraft,
    saveAuditNote,
    thcItems,
    thcBanner,
    thcCompletionPercent,
    toggleThcItem,
    resetThcChecklist,
    thcSignOffStatus,
    thcSignedOffBy,
    thcSignedOffAt,
    signOffThcChecklist,
    thcArchive,
    thcBlockers,
    thcOverrideEnabled,
    toggleThcOverride,
    thcPackageStatus,
    thcPackageRef,
    generateThcPackage,
    thcDispatchRecipient,
    thcDispatchStatus,
    thcDispatchBanner,
    thcDispatchHistory,
    cycleThcDispatchRecipient,
    dispatchThcPackage,
    acknowledgeThcDispatch,
    sendThcDispatchReminder,
    thcPendingReceipts,
    escalateThcDispatch,
    thcTurnoverStatus,
    thcClosedAt,
    closeThcTurnover,
    thcReopenReasonDraft,
    thcReopenBanner,
    thcReopenHistory,
    setThcReopenReasonDraft,
    reopenThcTurnover,
    thcInsights,
    thcReadiness,
    thcClosureAttempts,
    thcActionPlan,
    thcReceiptAging,
    thcClosureTrend
  } = useAdminFleetOverview();

  const navTitle: Record<typeof activeNav, string> = {
    dashboard: 'Dashboard',
    'live-map': 'Live Map',
    routes: 'Routes',
    'bus-stops': 'Bus Stops',
    schedule: 'Schedule',
    alerts: 'Alerts',
    drivers: 'Drivers',
    vehicles: 'Vehicles',
    reports: 'Reports',
    settings: 'Settings'
  };

  const navDescription: Record<typeof activeNav, string> = {
    dashboard: 'Operations overview across fleet, alerts, and handover readiness.',
    'live-map': 'Live tracking feed, route health trends, and incident monitoring.',
    routes: 'Route performance, dispatch policy controls, and SLA guardrails.',
    'bus-stops': 'Stop-level operations, service health, and dispatch coordination.',
    schedule: 'Service advisories, policy updates, and handover scheduling control.',
    alerts: 'Alert triage, acknowledgments, and operator escalation workflow.',
    drivers: 'Driver-facing handover, checklist, and operational continuity tools.',
    vehicles: 'Vehicle and turnover controls for shift and readiness management.',
    reports: 'Report snapshots, audit trail, and THC performance insights.',
    settings: 'System controls for dispatch policy, recovery, and thresholds.'
  };

  const showOverviewRows =
    activeNav === 'dashboard' || activeNav === 'live-map' || activeNav === 'bus-stops' || activeNav === 'alerts';
  const showControlPanels = {
    broadcast: activeNav === 'dashboard' || activeNav === 'schedule' || activeNav === 'alerts',
    trend: activeNav === 'dashboard' || activeNav === 'live-map' || activeNav === 'routes',
    policy: activeNav === 'dashboard' || activeNav === 'routes' || activeNav === 'settings',
    report: activeNav === 'dashboard' || activeNav === 'reports',
    handover: activeNav === 'dashboard' || activeNav === 'drivers' || activeNav === 'vehicles' || activeNav === 'schedule',
    sla: activeNav === 'dashboard' || activeNav === 'routes' || activeNav === 'settings',
    audit: activeNav === 'dashboard' || activeNav === 'reports' || activeNav === 'settings',
    thc:
      activeNav === 'dashboard' ||
      activeNav === 'drivers' ||
      activeNav === 'vehicles' ||
      activeNav === 'reports'
  };

  return (
    <View style={styles.pageShell}>
      {isWeb ? (
        <View style={styles.sidebar}>
          <View style={styles.sidebarLogoRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>T</Text>
            </View>
            <View>
              <Text style={styles.logoText}>TransitOps</Text>
              <Text style={styles.logoSub}>Admin</Text>
            </View>
          </View>

          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionLabel}>Overview</Text>
            <Pressable
              style={[styles.navItem, activeNav === 'dashboard' ? styles.navItemActive : null]}
              onPress={() => setActiveNav('dashboard')}
            >
              <Text style={activeNav === 'dashboard' ? styles.navItemTextActive : styles.navItemText}>Dashboard</Text>
            </Pressable>
            <Pressable style={[styles.navItem, activeNav === 'live-map' ? styles.navItemActive : null]} onPress={() => setActiveNav('live-map')}>
              <Text style={activeNav === 'live-map' ? styles.navItemTextActive : styles.navItemText}>Live Map</Text>
            </Pressable>
            <Pressable style={[styles.navItem, activeNav === 'routes' ? styles.navItemActive : null]} onPress={() => setActiveNav('routes')}>
              <Text style={activeNav === 'routes' ? styles.navItemTextActive : styles.navItemText}>Routes</Text>
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>3</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionLabel}>Manage</Text>
            <Pressable style={[styles.navItem, activeNav === 'bus-stops' ? styles.navItemActive : null]} onPress={() => setActiveNav('bus-stops')}>
              <Text style={activeNav === 'bus-stops' ? styles.navItemTextActive : styles.navItemText}>Bus Stops</Text>
            </Pressable>
            <Pressable style={[styles.navItem, activeNav === 'schedule' ? styles.navItemActive : null]} onPress={() => setActiveNav('schedule')}>
              <Text style={activeNav === 'schedule' ? styles.navItemTextActive : styles.navItemText}>Schedule</Text>
            </Pressable>
            <Pressable style={[styles.navItem, activeNav === 'alerts' ? styles.navItemActive : null]} onPress={() => setActiveNav('alerts')}>
              <Text style={activeNav === 'alerts' ? styles.navItemTextActive : styles.navItemText}>Alerts</Text>
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>7</Text>
              </View>
            </Pressable>
            <Pressable style={[styles.navItem, activeNav === 'drivers' ? styles.navItemActive : null]} onPress={() => setActiveNav('drivers')}>
              <Text style={activeNav === 'drivers' ? styles.navItemTextActive : styles.navItemText}>Drivers</Text>
            </Pressable>
            <Pressable style={[styles.navItem, activeNav === 'vehicles' ? styles.navItemActive : null]} onPress={() => setActiveNav('vehicles')}>
              <Text style={activeNav === 'vehicles' ? styles.navItemTextActive : styles.navItemText}>Vehicles</Text>
            </Pressable>
          </View>

          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionLabel}>System</Text>
            <Pressable style={[styles.navItem, activeNav === 'reports' ? styles.navItemActive : null]} onPress={() => setActiveNav('reports')}>
              <Text style={activeNav === 'reports' ? styles.navItemTextActive : styles.navItemText}>Reports</Text>
            </Pressable>
            <Pressable style={[styles.navItem, activeNav === 'settings' ? styles.navItemActive : null]} onPress={() => setActiveNav('settings')}>
              <Text style={activeNav === 'settings' ? styles.navItemTextActive : styles.navItemText}>Settings</Text>
            </Pressable>
          </View>

          <View style={styles.sidebarFooter}>
            <View style={styles.userRow}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>JM</Text>
              </View>
              <View>
                <Text style={styles.userName}>Juan M.</Text>
                <Text style={styles.userRole}>Ops Manager</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      <ScrollView style={styles.root} contentContainerStyle={[styles.rootContent, isWeb ? styles.rootContentWeb : null]}>
        {isWeb ? (
          <View style={styles.topbar}>
            <Text style={styles.topbarTitle}>{navTitle[activeNav]}</Text>
            <Text style={styles.topbarDate}>Updated {formatClock(lastUpdatedAt)}</Text>
            <View style={styles.searchBox}>
              <Text style={styles.searchBoxText}>Search stops, routes</Text>
            </View>
            <Pressable style={styles.topbarButton}>
              <Text style={styles.topbarButtonText}>☆</Text>
            </Pressable>
            <Pressable style={styles.topbarButton}>
              <Text style={styles.topbarButtonText}>🔔</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.dashboardContent}>
          <Text style={styles.heading}>Admin Fleet Overview</Text>
          <Text style={styles.subheading}>Mapandan e-Bus Operations Center</Text>
          <View style={styles.navSummaryCard}>
            <Text style={styles.navSummaryTitle}>{navTitle[activeNav]}</Text>
            <Text style={styles.navSummaryText}>{navDescription[activeNav]}</Text>
          </View>

          {showOverviewRows ? <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Active Trips</Text>
              <Text style={styles.metricValue}>{activeTrips}</Text>
              <Text style={styles.metricMeta}>Running now</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Avg Wait</Text>
              <Text style={styles.metricValue}>{avgWaitMins}m</Text>
              <Text style={styles.metricMeta}>Across routes</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Active Alerts</Text>
              <Text style={styles.metricValue}>{alertsToday}</Text>
              <Text style={styles.metricMeta}>{pendingIncidents} pending incidents</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Fleet Health</Text>
              <Text style={styles.metricValue}>{fleetHealth}</Text>
              <Text style={styles.metricMeta}>System status</Text>
            </View>
          </View> : null}

          {showOverviewRows ? <View style={styles.midRow}>
            <View style={styles.chartCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Passenger Volume</Text>
                  <Text style={styles.cardSub}>Hourly ridership approximation</Text>
                </View>
                <View style={styles.tabGroup}>
                  <Text style={[styles.tabPill, styles.tabPillActive]}>Today</Text>
                  <Text style={styles.tabPill}>Week</Text>
                  <Text style={styles.tabPill}>Month</Text>
                </View>
              </View>

              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotBlue]} />
                  <Text style={styles.legendText}>Passengers</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotAmber]} />
                  <Text style={styles.legendText}>Target</Text>
                </View>
              </View>

              <View style={styles.chartBarWrap}>
                {(routeTrendSummary.map((trend) => trend.avgWaitMins) ?? [8, 9, 7, 10]).map((value: number, index: number) => (
                  <View key={`bar-${index}`} style={styles.chartBarCol}>
                    <View style={[styles.chartBar, { height: Math.max(18, value * 7) }]} />
                    <Text style={styles.chartBarLabel}>{index + 1}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.liveCard}>
              <View style={styles.liveCardHeader}>
                <View style={styles.liveDot} />
                <Text style={styles.cardTitle}>Live Arrivals</Text>
              </View>

              {rows.slice(0, 5).map((row) => (
                <View key={`live-${row.id}`} style={styles.liveItem}>
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>{row.id.replace('BUS-', '')}</Text>
                  </View>
                  <View style={styles.liveBody}>
                    <Text style={styles.liveRoute}>{row.route}</Text>
                    <Text style={styles.liveDetail}>Occ {row.occupancyPercent}% • OTP {row.adherencePercent}%</Text>
                  </View>
                  <Text style={[styles.liveTime, { color: getStatusColor(row.status) }]}>{row.status}</Text>
                </View>
              ))}
            </View>
          </View> : null}

          {showOverviewRows ? <View style={styles.botRow}>
            <View style={styles.tableCard}>
              <View style={styles.tableToolbar}>
                <Text style={styles.cardTitle}>Bus Stops</Text>
                <View style={styles.filterChipActive}>
                  <Text style={styles.filterChipActiveText}>All</Text>
                </View>
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Live</Text>
                </View>
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Delayed</Text>
                </View>
                <Pressable style={styles.addButton}>
                  <Text style={styles.addButtonText}>+ Add Stop</Text>
                </Pressable>
              </View>

              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.colHeader, styles.colBus]}>Bus</Text>
                  <Text style={[styles.colHeader, styles.colRoute]}>Route</Text>
                  <Text style={[styles.colHeader, styles.colStatus]}>Status</Text>
                </View>

                {rows.map((row) => (
                  <View key={row.id} style={styles.tableRow}>
                    <Text style={[styles.cellText, styles.colBus]}>{row.id}</Text>
                    <View style={styles.colRoute}>
                      <Text style={styles.cellText}>{row.route}</Text>
                      <Text style={styles.cellSubtext}>
                        Occ {row.occupancyPercent}% • OTP {row.adherencePercent}%
                      </Text>
                    </View>
                    <Text style={[styles.colStatus, styles.statusText, { color: getStatusColor(row.status) }]}>
                      {row.status}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.tableFooter}>
                <Text style={styles.tableFooterText}>Showing {rows.length} active buses</Text>
              </View>
            </View>

            <View style={styles.alertCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Active Alerts</Text>
                  <Text style={styles.cardSub}>Requires operator attention</Text>
                </View>
              </View>

              {incidentQueue.map((incident) => (
                <View key={`alert-${incident.id}`} style={styles.alertItem}>
                  <View style={styles.alertBody}>
                    <Text style={styles.alertTitle}>{incident.busId} - {incident.type}</Text>
                    <Text style={styles.alertDesc}>{incident.note}</Text>
                    <Text style={styles.alertMeta}>Severity {incident.severity} • {formatClock(incident.reportedAt)}</Text>
                  </View>
                  <Pressable
                    style={[styles.ackButton, incident.acknowledged ? styles.ackButtonDone : null]}
                    onPress={() => acknowledgeIncident(incident.id)}
                    disabled={incident.acknowledged}
                  >
                    <Text style={styles.ackButtonText}>{incident.acknowledged ? 'ACKED' : 'ACK'}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View> : null}

          <View style={styles.controlGrid}>

      <View style={[styles.broadcastPanel, !showControlPanels.broadcast ? styles.hiddenPanel : null]}>
        <View style={styles.broadcastHeaderRow}>
          <Text style={styles.broadcastTitle}>Service Broadcast</Text>
          <Pressable style={styles.broadcastTargetChip} onPress={cycleBroadcastTarget}>
            <Text style={styles.broadcastTargetText}>{broadcastTarget}</Text>
          </Pressable>
        </View>

        <TextInput
          value={broadcastDraft}
          onChangeText={setBroadcastDraft}
          placeholder="Write service advisory message..."
          placeholderTextColor={colors.ink3}
          multiline
          style={styles.broadcastInput}
        />

        <Pressable
          style={[styles.broadcastButton, broadcastStatus === 'sending' ? styles.ackButtonDone : null]}
          onPress={sendBroadcast}
          disabled={broadcastStatus === 'sending'}
        >
          <Text style={styles.broadcastButtonText}>
            {broadcastStatus === 'sending' ? 'Sending...' : 'Send Broadcast'}
          </Text>
        </Pressable>

        {broadcastBanner ? <Text style={styles.broadcastBanner}>{broadcastBanner}</Text> : null}

        {broadcastHistory.length > 0 ? (
          <View style={styles.broadcastHistoryWrap}>
            <Text style={styles.broadcastHistoryTitle}>Recent Broadcasts</Text>
            {broadcastHistory.map((entry) => (
              <View key={entry.id} style={styles.broadcastHistoryRow}>
                <Text style={styles.broadcastHistoryMain}>{entry.target} • {formatClock(entry.at)}</Text>
                <Text style={styles.broadcastHistoryMessage}>{entry.message}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.trendPanel, !showControlPanels.trend ? styles.hiddenPanel : null]}>
        <Text style={styles.trendTitle}>Route Performance Trends</Text>
        {routeTrendSummary.map((trend) => (
          <View key={trend.route} style={styles.trendRow}>
            <View style={styles.trendRouteBlock}>
              <Text style={styles.trendRoute}>{trend.route}</Text>
              <Text style={styles.trendMeta}>Signal: {trend.trendSignal}</Text>
            </View>
            <View style={styles.trendMetricBlock}>
              <Text style={styles.trendWait}>{trend.avgWaitMins}m</Text>
              <Text style={styles.trendMetricLabel}>Avg Wait</Text>
            </View>
            <View style={styles.trendMetricBlock}>
              <Text style={styles.trendOtp}>{trend.otpPercent}%</Text>
              <Text style={styles.trendMetricLabel}>Avg OTP</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.policyPanel, !showControlPanels.policy ? styles.hiddenPanel : null]}>
        <Text style={styles.policyTitle}>Service Policy Controls</Text>

        <View style={styles.policyRow}>
          <Text style={styles.policyLabel}>Dispatch Mode</Text>
          <Pressable style={styles.policyChip} onPress={cycleDispatchMode}>
            <Text style={styles.policyChipText}>{dispatchMode}</Text>
          </Pressable>
        </View>

        <View style={styles.policyRow}>
          <Text style={styles.policyLabel}>Peak-Hour Policy</Text>
          <Pressable style={styles.policyChip} onPress={cyclePeakHourPolicy}>
            <Text style={styles.policyChipText}>{peakHourPolicy}</Text>
          </Pressable>
        </View>

        <View style={styles.policyRow}>
          <Text style={styles.policyLabel}>Auto Recovery</Text>
          <Pressable
            style={[styles.policyChip, autoRecoveryEnabled ? styles.policyChipEnabled : styles.policyChipDisabled]}
            onPress={toggleAutoRecovery}
          >
            <Text style={styles.policyChipText}>{autoRecoveryEnabled ? 'Enabled' : 'Disabled'}</Text>
          </Pressable>
        </View>

        {policyBanner ? <Text style={styles.policyBanner}>{policyBanner}</Text> : null}
      </View>

      <View style={[styles.reportPanel, !showControlPanels.report ? styles.hiddenPanel : null]}>
        <View style={styles.reportHeaderRow}>
          <Text style={styles.reportTitle}>Daily Report Snapshot</Text>
          <Pressable
            style={[styles.reportButton, reportStatus === 'generating' ? styles.ackButtonDone : null]}
            onPress={generateDailyReportSnapshot}
            disabled={reportStatus === 'generating'}
          >
            <Text style={styles.reportButtonText}>
              {reportStatus === 'generating' ? 'Generating...' : 'Generate'}
            </Text>
          </Pressable>
        </View>

        {reportBanner ? <Text style={styles.reportBanner}>{reportBanner}</Text> : null}

        {lastReportSnapshot ? (
          <View style={styles.reportSummaryCard}>
            <Text style={styles.reportSummaryTitle}>Latest Snapshot</Text>
            <Text style={styles.reportSummaryLine}>Time: {formatClock(lastReportSnapshot.generatedAt)}</Text>
            <Text style={styles.reportSummaryLine}>Active trips: {lastReportSnapshot.activeTrips}</Text>
            <Text style={styles.reportSummaryLine}>Average wait: {lastReportSnapshot.avgWaitMins} mins</Text>
            <Text style={styles.reportSummaryLine}>Pending incidents: {lastReportSnapshot.pendingIncidents}</Text>
            <Text style={styles.reportSummaryLine}>Fleet health: {lastReportSnapshot.fleetHealth}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.handoverPanel, !showControlPanels.handover ? styles.hiddenPanel : null]}>
        <Text style={styles.handoverTitle}>Shift Handover Notes</Text>

        <TextInput
          value={handoverNoteDraft}
          onChangeText={setHandoverNoteDraft}
          placeholder="Write key shift updates for the next dispatcher..."
          placeholderTextColor={colors.ink3}
          multiline
          style={styles.handoverInput}
        />

        <Pressable
          style={[styles.handoverButton, handoverStatus === 'saving' ? styles.ackButtonDone : null]}
          onPress={saveHandoverNote}
          disabled={handoverStatus === 'saving'}
        >
          <Text style={styles.handoverButtonText}>
            {handoverStatus === 'saving' ? 'Saving...' : 'Save Handover'}
          </Text>
        </Pressable>

        {handoverBanner ? <Text style={styles.handoverBanner}>{handoverBanner}</Text> : null}

        {handoverHistory.length > 0 ? (
          <View style={styles.handoverHistoryWrap}>
            <Text style={styles.handoverHistoryTitle}>Recent Notes</Text>
            {handoverHistory.map((entry) => (
              <View key={entry.id} style={styles.handoverHistoryRow}>
                <Text style={styles.handoverHistoryMeta}>{formatClock(entry.at)}</Text>
                <Text style={styles.handoverHistoryText}>{entry.note}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.slaPanel, !showControlPanels.sla ? styles.hiddenPanel : null]}>
        <Text style={styles.slaTitle}>SLA Guardrails</Text>

        <View style={styles.slaRow}>
          <Text style={styles.slaLabel}>Max Avg Wait</Text>
          <Pressable style={styles.slaChip} onPress={cycleSlaWaitThreshold}>
            <Text style={styles.slaChipText}>{slaWaitThresholdMins} mins</Text>
          </Pressable>
        </View>

        <View style={styles.slaRow}>
          <Text style={styles.slaLabel}>Min OTP</Text>
          <Pressable style={styles.slaChip} onPress={cycleSlaOtpThreshold}>
            <Text style={styles.slaChipText}>{slaOtpThresholdPercent}%</Text>
          </Pressable>
        </View>

        {slaBanner ? <Text style={styles.slaBanner}>{slaBanner}</Text> : null}

        <View style={styles.slaBreachWrap}>
          <Text style={styles.slaBreachTitle}>Active Breaches ({slaBreaches.length})</Text>
          {slaBreaches.length === 0 ? (
            <Text style={styles.slaNoBreach}>No SLA breaches detected.</Text>
          ) : (
            slaBreaches.map((breach) => (
              <Text key={breach.route} style={styles.slaBreachLine}>
                {breach.route}: {breach.avgWaitMins}m wait, {breach.otpPercent}% OTP
              </Text>
            ))
          )}
        </View>
      </View>

      <View style={[styles.auditPanel, !showControlPanels.audit ? styles.hiddenPanel : null]}>
        <Text style={styles.auditTitle}>Operations Audit Timeline</Text>

        <TextInput
          value={auditNoteDraft}
          onChangeText={setAuditNoteDraft}
          placeholder="Log dispatch action or decision..."
          placeholderTextColor={colors.ink3}
          multiline
          style={styles.auditInput}
        />

        <Pressable
          style={[styles.auditButton, auditStatus === 'saving' ? styles.ackButtonDone : null]}
          onPress={saveAuditNote}
          disabled={auditStatus === 'saving'}
        >
          <Text style={styles.auditButtonText}>
            {auditStatus === 'saving' ? 'Logging...' : 'Log Audit Note'}
          </Text>
        </Pressable>

        {auditBanner ? <Text style={styles.auditBanner}>{auditBanner}</Text> : null}

        <View style={styles.auditFeedWrap}>
          <Text style={styles.auditFeedTitle}>Recent Events</Text>
          {auditEvents.map((event) => (
            <View key={event.id} style={styles.auditEventRow}>
              <Text style={styles.auditEventMeta}>
                {event.actor} • {formatClock(event.at)}
              </Text>
              <Text style={styles.auditEventMessage}>{event.message}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.thcPanel, !showControlPanels.thc ? styles.hiddenPanel : null]}>
        <View style={styles.thcHeaderRow}>
          <Text style={styles.thcTitle}>THC: Team Handover Checklist</Text>
          <Text style={styles.thcPercent}>{thcCompletionPercent}%</Text>
        </View>

        {thcItems.map((item) => (
          <Pressable key={item.id} style={styles.thcItemRow} onPress={() => toggleThcItem(item.id)}>
            <Text style={[styles.thcCheck, item.done ? styles.thcCheckDone : null]}>
              {item.done ? 'x' : 'o'}
            </Text>
            <Text style={[styles.thcItemLabel, item.done ? styles.thcItemLabelDone : null]}>
              {item.label}
            </Text>
          </Pressable>
        ))}

        <Pressable style={styles.thcResetButton} onPress={resetThcChecklist}>
          <Text style={styles.thcResetText}>Reset Checklist</Text>
        </Pressable>

        <Pressable
          style={[styles.thcSignOffButton, thcSignOffStatus === 'signed' ? styles.ackButtonDone : null]}
          onPress={signOffThcChecklist}
        >
          <Text style={styles.thcSignOffText}>
            {thcSignOffStatus === 'signed' ? 'Signed Off' : 'Sign Off Checklist'}
          </Text>
        </Pressable>

        {thcBanner ? <Text style={styles.thcBanner}>{thcBanner}</Text> : null}

        {thcSignOffStatus === 'signed' && thcSignedOffBy && thcSignedOffAt ? (
          <Text style={styles.thcSignOffMeta}>
            Signed by {thcSignedOffBy} at {formatClock(thcSignedOffAt)}
          </Text>
        ) : null}

        {thcArchive.length > 0 ? (
          <View style={styles.thcArchiveWrap}>
            <Text style={styles.thcArchiveTitle}>Sign-off Archive</Text>
            {thcArchive.map((entry) => (
              <Text key={entry.id} style={styles.thcArchiveLine}>
                {formatClock(entry.signedOffAt)} - {entry.signedOffBy} - {entry.completionPercent}%
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.thcBlockerWrap}>
          <Text style={styles.thcBlockerTitle}>Current Blockers</Text>
          {thcBlockers.length === 0 ? (
            <Text style={styles.thcBlockerLine}>No blockers detected.</Text>
          ) : (
            thcBlockers.map((blocker) => (
              <Text key={blocker} style={styles.thcBlockerLine}>- {blocker}</Text>
            ))
          )}

          <Pressable style={styles.thcOverrideButton} onPress={toggleThcOverride}>
            <Text style={styles.thcOverrideText}>
              Override: {thcOverrideEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.thcPackageWrap}>
          <Pressable
            style={[styles.thcPackageButton, thcPackageStatus === 'generating' ? styles.ackButtonDone : null]}
            onPress={generateThcPackage}
            disabled={thcPackageStatus === 'generating'}
          >
            <Text style={styles.thcPackageButtonText}>
              {thcPackageStatus === 'generating' ? 'Generating Package...' : 'Generate THC Package'}
            </Text>
          </Pressable>

          {thcPackageRef ? (
            <Text style={styles.thcPackageRef}>Package Ref: {thcPackageRef}</Text>
          ) : null}

          <View style={styles.thcDispatchRow}>
            <Pressable style={styles.thcDispatchRecipientChip} onPress={cycleThcDispatchRecipient}>
              <Text style={styles.thcDispatchRecipientText}>{thcDispatchRecipient}</Text>
            </Pressable>
            <Pressable
              style={[styles.thcDispatchButton, thcDispatchStatus === 'sending' ? styles.ackButtonDone : null]}
              onPress={dispatchThcPackage}
              disabled={thcDispatchStatus === 'sending'}
            >
              <Text style={styles.thcDispatchButtonText}>
                {thcDispatchStatus === 'sending' ? 'Sending...' : 'Dispatch'}
              </Text>
            </Pressable>
          </View>

          {thcDispatchBanner ? <Text style={styles.thcDispatchBanner}>{thcDispatchBanner}</Text> : null}

          <Text style={styles.thcDispatchPending}>Pending Receipts: {thcPendingReceipts}</Text>

          {thcDispatchHistory.length > 0 ? (
            <View style={styles.thcDispatchHistoryWrap}>
              <Text style={styles.thcDispatchHistoryTitle}>Dispatch History</Text>
              {thcDispatchHistory.map((entry) => (
                <View key={entry.id} style={styles.thcDispatchHistoryRow}>
                  <Text style={styles.thcDispatchHistoryLine}>
                    {formatClock(entry.at)} - {entry.packageRef} - {entry.recipient}
                  </Text>

                  {entry.acknowledged ? (
                    <Text style={styles.thcDispatchAcked}>
                      Received {entry.acknowledgedAt ? formatClock(entry.acknowledgedAt) : ''}
                    </Text>
                  ) : (
                    <View style={styles.thcDispatchActionRow}>
                      <Pressable style={styles.thcDispatchAckButton} onPress={() => acknowledgeThcDispatch(entry.id)}>
                        <Text style={styles.thcDispatchAckButtonText}>Acknowledge Receipt</Text>
                      </Pressable>
                      <Pressable style={styles.thcDispatchRemindButton} onPress={() => sendThcDispatchReminder(entry.id)}>
                        <Text style={styles.thcDispatchRemindText}>Send Reminder</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.thcDispatchEscalateButton, entry.escalated ? styles.ackButtonDone : null]}
                        onPress={() => escalateThcDispatch(entry.id)}
                        disabled={entry.escalated}
                      >
                        <Text style={styles.thcDispatchEscalateText}>
                          {entry.escalated ? 'Escalated' : 'Escalate'}
                        </Text>
                      </Pressable>
                      <Text style={styles.thcDispatchReminderMeta}>Reminders: {entry.reminderCount}</Text>
                      {entry.escalated && entry.escalatedAt ? (
                        <Text style={styles.thcDispatchEscalatedMeta}>Escalated {formatClock(entry.escalatedAt)}</Text>
                      ) : null}
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            style={[styles.thcCloseButton, thcTurnoverStatus === 'closed' ? styles.ackButtonDone : null]}
            onPress={closeThcTurnover}
          >
            <Text style={styles.thcCloseButtonText}>
              {thcTurnoverStatus === 'closed' ? 'Turnover Closed' : 'Close THC Turnover'}
            </Text>
          </Pressable>

          {thcTurnoverStatus === 'closed' && thcClosedAt ? (
            <Text style={styles.thcClosedMeta}>Closed at {formatClock(thcClosedAt)}</Text>
          ) : null}

          {thcClosureAttempts.length > 0 ? (
            <View style={styles.thcClosureHistoryWrap}>
              <Text style={styles.thcClosureHistoryTitle}>Closure Attempt Log</Text>
              {thcClosureAttempts.map((entry) => (
                <Text key={entry.id} style={styles.thcClosureHistoryLine}>
                  {formatClock(entry.at)} - {entry.status} - {entry.reason}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.thcReopenWrap}>
            <Text style={styles.thcReopenTitle}>Controlled Reopen</Text>
            <TextInput
              value={thcReopenReasonDraft}
              onChangeText={setThcReopenReasonDraft}
              placeholder="Reason for reopening turnover..."
              placeholderTextColor={colors.ink3}
              style={styles.thcReopenInput}
            />
            <Pressable style={styles.thcReopenButton} onPress={reopenThcTurnover}>
              <Text style={styles.thcReopenButtonText}>Reopen Turnover</Text>
            </Pressable>

            {thcReopenBanner ? <Text style={styles.thcReopenBanner}>{thcReopenBanner}</Text> : null}

            {thcReopenHistory.length > 0 ? (
              <View style={styles.thcReopenHistoryWrap}>
                <Text style={styles.thcReopenHistoryTitle}>Reopen Log</Text>
                {thcReopenHistory.map((entry) => (
                  <Text key={entry.id} style={styles.thcReopenHistoryLine}>
                    {formatClock(entry.at)} - {entry.reason}
                  </Text>
                ))}
              </View>
            ) : null}

            <View style={styles.thcInsightsWrap}>
              <Text style={styles.thcInsightsTitle}>THC Insights</Text>
              <Text style={styles.thcInsightsLine}>Dispatches: {thcInsights.totalDispatches}</Text>
              <Text style={styles.thcInsightsLine}>Acknowledged: {thcInsights.acknowledgedCount}</Text>
              <Text style={styles.thcInsightsLine}>Ack Rate: {thcInsights.ackRatePercent}%</Text>
              <Text style={styles.thcInsightsLine}>Escalated: {thcInsights.escalatedCount}</Text>
              <Text style={styles.thcInsightsLine}>
                Avg Reminders: {thcInsights.avgRemindersPerDispatch}
              </Text>
              <Text style={styles.thcInsightsLine}>Readiness Score: {thcReadiness.score}</Text>
              <Text style={styles.thcInsightsLine}>Readiness Level: {thcReadiness.level}</Text>
              <Text style={styles.thcInsightsSummary}>{thcReadiness.summary}</Text>
            </View>

            <View style={styles.thcActionPlanWrap}>
              <Text style={styles.thcActionPlanTitle}>Turnover Action Plan</Text>
              <Text style={styles.thcActionPlanStatus}>{thcActionPlan.statusLine}</Text>
              {thcActionPlan.hasActions ? (
                thcActionPlan.actions.map((action) => (
                  <Text key={action} style={styles.thcActionPlanLine}>- {action}</Text>
                ))
              ) : (
                <Text style={styles.thcActionPlanLine}>No pending actions.</Text>
              )}
            </View>

            <View style={styles.thcAgingWrap}>
              <Text style={styles.thcAgingTitle}>Receipt Aging Monitor</Text>
              <Text style={styles.thcAgingLine}>Pending: {thcReceiptAging.pendingCount}</Text>
              <Text style={styles.thcAgingLine}>Oldest: {thcReceiptAging.oldestPendingMins} min</Text>
              <Text style={styles.thcAgingLine}>Average: {thcReceiptAging.avgPendingMins} min</Text>
              <Text style={styles.thcAgingLine}>Overdue (15m+): {thcReceiptAging.overdueCount}</Text>
              <Text style={styles.thcAgingSeverity}>Severity: {thcReceiptAging.severity}</Text>
            </View>

            <View style={styles.thcTrendWrap}>
              <Text style={styles.thcTrendTitle}>Closure Trend</Text>
              <Text style={styles.thcTrendLine}>Recent window: {thcClosureTrend.recentWindow}</Text>
              <Text style={styles.thcTrendLine}>Closed: {thcClosureTrend.recentClosed}</Text>
              <Text style={styles.thcTrendLine}>Blocked: {thcClosureTrend.recentBlocked}</Text>
              <Text style={styles.thcTrendLine}>Conversion: {thcClosureTrend.conversionRatePercent}%</Text>
              <Text style={styles.thcTrendLine}>Last outcome: {thcClosureTrend.lastOutcome}</Text>
              <Text style={styles.thcTrendSignal}>Signal: {thcClosureTrend.trendSignal}</Text>
            </View>
          </View>
        </View>
          </View>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageShell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg
  },
  sidebar: {
    width: 260,
    backgroundColor: colors.bg2,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.lg
  },
  sidebarTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    fontFamily: typography.fontDisplay
  },
  sidebarItem: {
    color: colors.ink2,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.fontBody
  },
  root: {
    flex: 1,
    backgroundColor: colors.bg
  },
  rootContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md
  },
  rootContentWeb: {
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 28,
    gap: spacing.md
  },
  sidebarLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoMarkText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: typography.fontDisplay
  },
  logoText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: typography.fontDisplay
  },
  logoSub: {
    color: colors.ink4,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: typography.fontBody
  },
  sidebarSection: {
    gap: 3
  },
  sidebarSectionLabel: {
    color: colors.ink4,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.s10,
    marginBottom: 4,
    fontFamily: typography.fontBody
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.xs,
    paddingVertical: 8
  },
  navItemActive: {
    backgroundColor: colors.amberBg,
    borderColor: colors.amberBorder
  },
  navItemText: {
    color: colors.ink3,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    fontFamily: typography.fontBody
  },
  navItemTextActive: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    fontFamily: typography.fontBody
  },
  navBadge: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.redBorder,
    backgroundColor: colors.redBg,
    paddingHorizontal: 6,
    paddingVertical: 1
  },
  navBadgeText: {
    color: colors.red,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: typography.fontBody
  },
  sidebarFooter: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 7
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    backgroundColor: colors.blueBg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  userAvatarText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.fontBody
  },
  userName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  userRole: {
    color: colors.ink4,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  topbar: {
    minHeight: 60,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }
  },
  topbarTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    fontFamily: typography.fontDisplay
  },
  topbarDate: {
    color: colors.ink3,
    fontSize: 11,
    marginLeft: spacing.s10,
    fontFamily: typography.fontBody
  },
  searchBox: {
    marginLeft: 'auto',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.borderMd,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    minWidth: 170
  },
  searchBoxText: {
    color: colors.ink3,
    fontSize: 11,
    fontFamily: typography.fontBody
  },
  topbarButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.borderMd,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  topbarButtonText: {
    color: colors.ink3,
    fontSize: 13,
    fontFamily: typography.fontBody
  },
  dashboardContent: {
    gap: spacing.md
  },
  navSummaryCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }
  },
  navSummaryTitle: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: -0.1,
    fontFamily: typography.fontDisplay
  },
  navSummaryText: {
    color: colors.ink2,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: typography.fontBody
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap'
  },
  metricCard: {
    minWidth: 170,
    flexGrow: 1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }
  },
  metricLabel: {
    color: colors.ink3,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: typography.fontBody
  },
  metricValue: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '900',
    fontFamily: typography.fontDisplay
  },
  metricMeta: {
    color: colors.ink3,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: typography.fontBody
  },
  midRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap'
  },
  chartCard: {
    flexGrow: 1,
    minWidth: 360,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
    fontFamily: typography.fontDisplay
  },
  cardSub: {
    color: colors.ink4,
    fontSize: 10,
    marginTop: 1,
    fontFamily: typography.fontBody
  },
  tabGroup: {
    flexDirection: 'row',
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderMd,
    backgroundColor: colors.surface2,
    padding: 3
  },
  tabPill: {
    color: colors.ink3,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontFamily: typography.fontBody
  },
  tabPillActive: {
    color: colors.ink,
    backgroundColor: colors.surface
  },
  chartLegend: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  legendDot: {
    width: 10,
    height: 3,
    borderRadius: 2
  },
  legendDotBlue: {
    backgroundColor: colors.blue
  },
  legendDotAmber: {
    backgroundColor: colors.amber
  },
  legendText: {
    color: colors.ink3,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  chartBarWrap: {
    height: 136,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4
  },
  chartBar: {
    width: '100%',
    maxWidth: 22,
    borderRadius: 7,
    backgroundColor: colors.blueBg,
    borderWidth: 1,
    borderColor: colors.blueBorder
  },
  chartBarLabel: {
    color: colors.ink4,
    fontSize: 9,
    fontFamily: typography.fontBody
  },
  liveCard: {
    width: 340,
    borderRadius: radii.xl,
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
  liveCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: radii.full,
    backgroundColor: colors.green
  },
  liveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
    paddingTop: 2
  },
  liveBadge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    backgroundColor: colors.blueBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 1
  },
  liveBadgeText: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontDisplay
  },
  liveBody: {
    flex: 1,
    gap: 2
  },
  liveRoute: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  liveDetail: {
    color: colors.ink3,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  liveTime: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  botRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  tableCard: {
    flexGrow: 1,
    minWidth: 360,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }
  },
  tableToolbar: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs
  },
  filterChip: {
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.borderMd,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  filterChipText: {
    color: colors.ink3,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  filterChipActive: {
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    backgroundColor: colors.amberBg,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  filterChipActiveText: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  addButton: {
    marginLeft: 'auto',
    borderRadius: radii.md,
    backgroundColor: colors.amber,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    ...shadow.sm
  },
  addButtonText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  tableFooter: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface2
  },
  tableFooterText: {
    color: colors.ink3,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  alertCard: {
    width: 360,
    borderRadius: radii.xl,
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
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs
  },
  alertBody: {
    flex: 1,
    gap: 2
  },
  alertTitle: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  alertDesc: {
    color: colors.ink2,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: typography.fontBody
  },
  alertMeta: {
    color: colors.ink4,
    fontSize: 9,
    fontFamily: typography.fontBody
  },
  controlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignItems: 'flex-start'
  },
  hiddenPanel: {
    display: 'none'
  },
  heading: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
    fontFamily: typography.fontDisplay
  },
  subheading: {
    color: colors.ink2,
    fontSize: 12,
    marginTop: -4,
    fontFamily: typography.fontBody
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.md
  },
  kpiCard: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }
  },
  kpiValue: {
    color: colors.ink,
    fontSize: 21,
    lineHeight: 22,
    fontWeight: '900',
    fontFamily: typography.fontDisplay
  },
  kpiLabel: {
    color: colors.ink2,
    fontSize: 10,
    marginTop: 2,
    fontFamily: typography.fontBody
  },
  healthCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    backgroundColor: colors.blueBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2
  },
  healthLabel: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  healthValue: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: typography.fontDisplay
  },
  healthMeta: {
    color: colors.ink2,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  table: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMd,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8
  },
  colHeader: {
    color: colors.ink2,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontFamily: typography.fontBody
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMd,
    alignItems: 'center'
  },
  colBus: {
    width: 68
  },
  colRoute: {
    flex: 1,
    paddingRight: spacing.xs
  },
  colStatus: {
    width: 72,
    textAlign: 'right'
  },
  cellText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  cellSubtext: {
    color: colors.ink3,
    fontSize: 10,
    marginTop: 2,
    fontFamily: typography.fontBody
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.fontBody
  },
  incidentPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    backgroundColor: colors.amberBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }
  },
  incidentTitle: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
    fontFamily: typography.fontDisplay
  },
  incidentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.amberBorder,
    paddingTop: spacing.xs
  },
  incidentLeft: {
    flex: 1,
    gap: 2
  },
  incidentMain: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  incidentNote: {
    color: colors.ink2,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  incidentTime: {
    color: colors.ink3,
    fontSize: 9,
    fontFamily: typography.fontBody
  },
  ackButton: {
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.amber,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    minWidth: 64,
    alignItems: 'center'
  },
  ackButtonDone: {
    borderColor: colors.green,
    backgroundColor: colors.greenBg
  },
  ackButtonText: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontFamily: typography.fontBody
  },
  broadcastPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    backgroundColor: colors.blueBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }
  },
  broadcastHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs
  },
  broadcastTitle: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
    flex: 1,
    fontFamily: typography.fontDisplay
  },
  broadcastTargetChip: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  broadcastTargetText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  broadcastInput: {
    minHeight: 70,
    maxHeight: 100,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 13,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontBody
  },
  broadcastButton: {
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.blue,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    alignItems: 'center'
  },
  broadcastButtonText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontFamily: typography.fontBody
  },
  broadcastBanner: {
    color: colors.ink2,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: typography.fontBody
  },
  broadcastHistoryWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.borderMd,
    paddingTop: spacing.xs,
    gap: 5
  },
  broadcastHistoryTitle: {
    color: colors.ink2,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  broadcastHistoryRow: {
    gap: 2
  },
  broadcastHistoryMain: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  broadcastHistoryMessage: {
    color: colors.ink2,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  trendPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }
  },
  trendTitle: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
    fontFamily: typography.fontDisplay
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.greenBorder,
    paddingTop: spacing.xs
  },
  trendRouteBlock: {
    flex: 1,
    gap: 2
  },
  trendRoute: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  trendMeta: {
    color: colors.ink2,
    fontSize: 9,
    fontFamily: typography.fontBody
  },
  trendMetricBlock: {
    width: 64,
    alignItems: 'flex-end'
  },
  trendWait: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: typography.fontDisplay
  },
  trendOtp: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: typography.fontDisplay
  },
  trendMetricLabel: {
    color: colors.ink2,
    fontSize: 9,
    fontFamily: typography.fontBody
  },
  policyPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }
  },
  policyTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
    fontFamily: typography.fontDisplay
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  policyLabel: {
    color: colors.ink2,
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
    fontFamily: typography.fontBody
  },
  policyChip: {
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.blue,
    backgroundColor: colors.blueBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minWidth: 130,
    alignItems: 'center'
  },
  policyChipEnabled: {
    borderColor: colors.green,
    backgroundColor: colors.greenBg
  },
  policyChipDisabled: {
    borderColor: colors.red,
    backgroundColor: colors.redBg
  },
  policyChipText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontFamily: typography.fontBody
  },
  policyBanner: {
    color: colors.ink2,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: typography.fontBody
  },
  reportPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }
  },
  reportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs
  },
  reportTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
    flex: 1,
    fontFamily: typography.fontDisplay
  },
  reportButton: {
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.blue,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    minWidth: 90,
    alignItems: 'center'
  },
  reportButtonText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontFamily: typography.fontBody
  },
  reportBanner: {
    color: colors.ink2,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: typography.fontBody
  },
  reportSummaryCard: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderMd,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2
  },
  reportSummaryTitle: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  reportSummaryLine: {
    color: colors.ink2,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  handoverPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    backgroundColor: colors.amberBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }
  },
  handoverTitle: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
    fontFamily: typography.fontDisplay
  },
  handoverInput: {
    minHeight: 70,
    maxHeight: 100,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 13,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontBody
  },
  handoverButton: {
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.amber,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    alignItems: 'center'
  },
  handoverButtonText: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontFamily: typography.fontBody
  },
  handoverBanner: {
    color: colors.ink2,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: typography.fontBody
  },
  handoverHistoryWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.amberBorder,
    paddingTop: spacing.xs,
    gap: 4
  },
  handoverHistoryTitle: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  handoverHistoryRow: {
    gap: 2
  },
  handoverHistoryMeta: {
    color: colors.amber,
    fontSize: 9,
    fontFamily: typography.fontBody
  },
  handoverHistoryText: {
    color: colors.ink2,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  slaPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }
  },
  slaPanelOld: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    backgroundColor: colors.amberBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  slaTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
    fontFamily: typography.fontDisplay
  },
  slaTitleOld: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  slaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs
  },
  slaLabel: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
    fontFamily: typography.fontBody
  },
  slaChip: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    backgroundColor: colors.amberBg,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    minWidth: 92,
    alignItems: 'center'
  },
  slaChipText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  slaBanner: {
    color: colors.ink2,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: typography.fontBody
  },
  slaBreachWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.amberBorder,
    paddingTop: spacing.xs,
    gap: 4
  },
  slaBreachTitle: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  slaNoBreach: {
    color: colors.amber,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  slaBreachLine: {
    color: colors.ink2,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  auditPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }
  },
  auditPanelOld: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  auditTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
    fontFamily: typography.fontDisplay
  },
  auditTitleOld: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  auditInput: {
    minHeight: 70,
    maxHeight: 100,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    color: colors.ink,
    fontSize: 13,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontBody
  },
  auditInputOld: {
    minHeight: 56,
    maxHeight: 92,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 12,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontFamily: typography.fontBody
  },
  auditButton: {
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    alignItems: 'center'
  },
  auditButtonOld: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderMd,
    backgroundColor: colors.surface2,
    paddingVertical: 6,
    alignItems: 'center'
  },
  auditButtonText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontFamily: typography.fontBody
  },
  auditButtonTextOld: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontBody
  },
  auditBanner: {
    color: colors.ink2,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: typography.fontBody
  },
  auditFeedWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.borderMd,
    paddingTop: spacing.xs,
    gap: 4
  },
  auditFeedTitle: {
    color: colors.ink2,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fontDisplay
  },
  auditEventRow: {
    gap: 2
  },
  auditEventMeta: {
    color: colors.ink3,
    fontSize: 9,
    fontFamily: typography.fontBody
  },
  auditEventMessage: {
    color: colors.ink,
    fontSize: 10,
    fontFamily: typography.fontBody
  },
  thcPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }
  },
  thcPanelOld: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  thcHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs
  },
  thcTitle: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
    fontFamily: typography.fontDisplay
  },
  thcTitleOld: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
    fontFamily: typography.fontDisplay
  },
  thcPercent: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: typography.fontDisplay
  },
  thcItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  thcCheck: {
    width: 18,
    color: colors.green,
    fontSize: 12,
    fontWeight: '900'
  },
  thcCheckDone: {
    color: colors.green
  },
  thcItemLabel: {
    color: colors.ink,
    fontSize: 10,
    flex: 1,
    fontFamily: typography.fontBody
  },
  thcItemLabelDone: {
    color: colors.ink2
  },
  thcResetButton: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: colors.greenBg,
    paddingVertical: 8,
    alignItems: 'center'
  },
  thcResetText: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  thcSignOffButton: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: colors.greenBg,
    paddingVertical: 10,
    alignItems: 'center'
  },
  thcSignOffText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  thcBanner: {
    color: colors.ink2,
    fontSize: 10,
    lineHeight: 13
  },
  thcSignOffMeta: {
    color: colors.ink,
    fontSize: 10
  },
  thcArchiveWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.greenBorder,
    paddingTop: spacing.xs,
    gap: 3
  },
  thcArchiveTitle: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800'
  },
  thcArchiveLine: {
    color: colors.ink,
    fontSize: 10
  },
  thcBlockerWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.greenBorder,
    paddingTop: spacing.xs,
    gap: 4
  },
  thcBlockerTitle: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800'
  },
  thcBlockerLine: {
    color: colors.ink,
    fontSize: 10
  },
  thcOverrideButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 2
  },
  thcOverrideText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700'
  },
  thcPackageWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.greenBorder,
    paddingTop: spacing.xs,
    gap: 4
  },
  thcPackageButton: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: colors.greenBg,
    paddingVertical: 10,
    alignItems: 'center'
  },
  thcPackageButtonText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  thcPackageRef: {
    color: colors.ink2,
    fontSize: 10
  },
  thcDispatchRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center'
  },
  thcDispatchRecipientChip: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg,
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
    alignItems: 'center'
  },
  thcDispatchRecipientText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700'
  },
  thcDispatchButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    alignItems: 'center'
  },
  thcDispatchButtonText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700'
  },
  thcDispatchBanner: {
    color: colors.ink2,
    fontSize: 10,
    lineHeight: 13
  },
  thcDispatchPending: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '700'
  },
  thcDispatchHistoryWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.greenBorder,
    paddingTop: spacing.xs,
    gap: 3
  },
  thcDispatchHistoryTitle: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800'
  },
  thcDispatchHistoryLine: {
    color: colors.ink,
    fontSize: 10
  },
  thcDispatchHistoryRow: {
    gap: 3
  },
  thcDispatchActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap'
  },
  thcDispatchAckButton: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  thcDispatchAckButtonText: {
    color: colors.ink,
    fontSize: 9,
    fontWeight: '700'
  },
  thcDispatchRemindButton: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  thcDispatchRemindText: {
    color: colors.ink,
    fontSize: 9,
    fontWeight: '700'
  },
  thcDispatchEscalateButton: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.redBorder,
    backgroundColor: colors.redBg,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  thcDispatchEscalateText: {
    color: colors.red,
    fontSize: 9,
    fontWeight: '700'
  },
  thcDispatchReminderMeta: {
    color: colors.green,
    fontSize: 9
  },
  thcDispatchEscalatedMeta: {
    color: colors.red,
    fontSize: 9,
    fontWeight: '700'
  },
  thcDispatchAcked: {
    color: colors.green,
    fontSize: 9,
    fontWeight: '700'
  },
  thcCloseButton: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: colors.greenBg,
    paddingVertical: 10,
    alignItems: 'center'
  },
  thcCloseButtonText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  thcClosedMeta: {
    color: colors.ink2,
    fontSize: 10,
    textAlign: 'center'
  },
  thcClosureHistoryWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.greenBorder,
    paddingTop: spacing.xs,
    gap: 3
  },
  thcClosureHistoryTitle: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800'
  },
  thcClosureHistoryLine: {
    color: colors.ink,
    fontSize: 10
  },
  thcReopenWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.greenBorder,
    paddingTop: spacing.xs,
    gap: 4
  },
  thcReopenTitle: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800'
  },
  thcReopenInput: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10
  },
  thcReopenButton: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: colors.greenBg,
    paddingVertical: 10,
    alignItems: 'center'
  },
  thcReopenButtonText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  thcReopenBanner: {
    color: colors.ink2,
    fontSize: 10,
    lineHeight: 13
  },
  thcReopenHistoryWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.greenBorder,
    paddingTop: spacing.xs,
    gap: 3
  },
  thcReopenHistoryTitle: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800'
  },
  thcReopenHistoryLine: {
    color: colors.ink,
    fontSize: 10
  },
  thcInsightsWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.greenBorder,
    paddingTop: spacing.xs,
    gap: 2
  },
  thcInsightsTitle: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800'
  },
  thcInsightsLine: {
    color: colors.ink,
    fontSize: 10
  },
  thcInsightsSummary: {
    color: colors.ink2,
    fontSize: 9,
    lineHeight: 12
  },
  thcActionPlanWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.greenBorder,
    paddingTop: spacing.xs,
    gap: 3
  },
  thcActionPlanTitle: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800'
  },
  thcActionPlanStatus: {
    color: colors.ink2,
    fontSize: 10,
    fontWeight: '700'
  },
  thcActionPlanLine: {
    color: colors.ink,
    fontSize: 10
  },
  thcAgingWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.greenBorder,
    paddingTop: spacing.xs,
    gap: 2
  },
  thcAgingTitle: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800'
  },
  thcAgingLine: {
    color: colors.ink,
    fontSize: 10
  },
  thcAgingSeverity: {
    color: colors.ink2,
    fontSize: 10,
    fontWeight: '700'
  },
  thcTrendWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.greenBorder,
    paddingTop: spacing.xs,
    gap: 2
  },
  thcTrendTitle: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800'
  },
  thcTrendLine: {
    color: colors.ink,
    fontSize: 10
  },
  thcTrendSignal: {
    color: colors.ink2,
    fontSize: 10,
    fontWeight: '700'
  }
});

