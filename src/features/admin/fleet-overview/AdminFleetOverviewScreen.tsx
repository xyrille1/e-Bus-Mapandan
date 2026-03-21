import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { spacing } from '../../../shared/theme/tokens';

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
    return '#facc15';
  }

  if (status === 'Offline') {
    return '#fb7185';
  }

  return '#34d399';
}

export function AdminFleetOverviewScreen() {
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
    thcReceiptAging
  } = useAdminFleetOverview();

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Admin Fleet Overview</Text>
      <Text style={styles.subheading}>Mapandan e-Bus Operations Center</Text>

      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{activeTrips}</Text>
          <Text style={styles.kpiLabel}>Active Trips</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{avgWaitMins}</Text>
          <Text style={styles.kpiLabel}>Avg Wait (min)</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{alertsToday}</Text>
          <Text style={styles.kpiLabel}>Alerts Today</Text>
        </View>
      </View>

      <View style={styles.healthCard}>
        <Text style={styles.healthLabel}>Fleet Health</Text>
        <Text style={styles.healthValue}>{fleetHealth}</Text>
        <Text style={styles.healthMeta}>Updated {formatClock(lastUpdatedAt)} • Pending incidents {pendingIncidents}</Text>
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

      <View style={styles.incidentPanel}>
        <Text style={styles.incidentTitle}>Incident Queue</Text>
        {incidentQueue.map((incident) => (
          <View key={incident.id} style={styles.incidentRow}>
            <View style={styles.incidentLeft}>
              <Text style={styles.incidentMain}>
                {incident.busId} • {incident.type} • {incident.severity}
              </Text>
              <Text style={styles.incidentNote}>{incident.note}</Text>
              <Text style={styles.incidentTime}>Reported {formatClock(incident.reportedAt)}</Text>
            </View>

            <Pressable
              style={[
                styles.ackButton,
                incident.acknowledged ? styles.ackButtonDone : null
              ]}
              onPress={() => acknowledgeIncident(incident.id)}
              disabled={incident.acknowledged}
            >
              <Text style={styles.ackButtonText}>
                {incident.acknowledged ? 'ACKED' : 'ACK'}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.broadcastPanel}>
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
          placeholderTextColor="#9db4dd"
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

      <View style={styles.trendPanel}>
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

      <View style={styles.policyPanel}>
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

      <View style={styles.reportPanel}>
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

      <View style={styles.handoverPanel}>
        <Text style={styles.handoverTitle}>Shift Handover Notes</Text>

        <TextInput
          value={handoverNoteDraft}
          onChangeText={setHandoverNoteDraft}
          placeholder="Write key shift updates for the next dispatcher..."
          placeholderTextColor="#c7d2fe"
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

      <View style={styles.slaPanel}>
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

      <View style={styles.auditPanel}>
        <Text style={styles.auditTitle}>Operations Audit Timeline</Text>

        <TextInput
          value={auditNoteDraft}
          onChangeText={setAuditNoteDraft}
          placeholder="Log dispatch action or decision..."
          placeholderTextColor="#cbd5e1"
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

      <View style={styles.thcPanel}>
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
              placeholderTextColor="#bbf7d0"
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
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#081226',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm
  },
  heading: {
    color: '#e8f1ff',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '900'
  },
  subheading: {
    color: '#9fb4db',
    fontSize: 12,
    marginTop: -4
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  kpiCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(86, 117, 188, 0.58)',
    backgroundColor: 'rgba(21, 38, 82, 0.74)',
    paddingVertical: spacing.xs,
    alignItems: 'center'
  },
  kpiValue: {
    color: '#b9ddff',
    fontSize: 21,
    lineHeight: 22,
    fontWeight: '900'
  },
  kpiLabel: {
    color: '#8da7d6',
    fontSize: 10,
    marginTop: 2
  },
  healthCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(64, 161, 210, 0.56)',
    backgroundColor: 'rgba(16, 69, 110, 0.52)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2
  },
  healthLabel: {
    color: '#9ec6ff',
    fontSize: 10,
    fontWeight: '700'
  },
  healthValue: {
    color: '#d8eeff',
    fontSize: 17,
    fontWeight: '900'
  },
  healthMeta: {
    color: '#acd0ff',
    fontSize: 10
  },
  table: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 104, 168, 0.58)',
    backgroundColor: 'rgba(17, 30, 64, 0.82)',
    overflow: 'hidden'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(31, 52, 102, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(87, 117, 184, 0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8
  },
  colHeader: {
    color: '#bbd3ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(57, 82, 143, 0.35)',
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
    color: '#e2ecff',
    fontSize: 11,
    fontWeight: '700'
  },
  cellSubtext: {
    color: '#9ab0da',
    fontSize: 10,
    marginTop: 2
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800'
  },
  incidentPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(191, 141, 79, 0.56)',
    backgroundColor: 'rgba(76, 50, 19, 0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  incidentTitle: {
    color: '#ffe3b8',
    fontSize: 11,
    fontWeight: '800'
  },
  incidentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 157, 106, 0.35)',
    paddingTop: spacing.xs
  },
  incidentLeft: {
    flex: 1,
    gap: 2
  },
  incidentMain: {
    color: '#fff0d7',
    fontSize: 10,
    fontWeight: '700'
  },
  incidentNote: {
    color: '#f7d9b2',
    fontSize: 10
  },
  incidentTime: {
    color: '#dcbf96',
    fontSize: 9
  },
  ackButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(254, 215, 170, 0.78)',
    backgroundColor: 'rgba(180, 105, 31, 0.62)',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    minWidth: 58,
    alignItems: 'center'
  },
  ackButtonDone: {
    borderColor: 'rgba(110, 231, 183, 0.72)',
    backgroundColor: 'rgba(5, 120, 93, 0.56)'
  },
  ackButtonText: {
    color: '#fff6e8',
    fontSize: 10,
    fontWeight: '800'
  },
  broadcastPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(110, 154, 232, 0.55)',
    backgroundColor: 'rgba(20, 46, 96, 0.58)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  broadcastHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs
  },
  broadcastTitle: {
    color: '#d5e7ff',
    fontSize: 11,
    fontWeight: '800',
    flex: 1
  },
  broadcastTargetChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(158, 195, 255, 0.76)',
    backgroundColor: 'rgba(36, 78, 143, 0.64)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  broadcastTargetText: {
    color: '#e8f1ff',
    fontSize: 10,
    fontWeight: '700'
  },
  broadcastInput: {
    minHeight: 62,
    maxHeight: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(123, 166, 240, 0.62)',
    backgroundColor: 'rgba(15, 37, 79, 0.74)',
    color: '#ebf2ff',
    fontSize: 12,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  broadcastButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(134, 199, 255, 0.74)',
    backgroundColor: 'rgba(26, 108, 171, 0.62)',
    paddingVertical: 7,
    alignItems: 'center'
  },
  broadcastButtonText: {
    color: '#f0f7ff',
    fontSize: 11,
    fontWeight: '800'
  },
  broadcastBanner: {
    color: '#cde2ff',
    fontSize: 10,
    lineHeight: 13
  },
  broadcastHistoryWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(119, 160, 235, 0.4)',
    paddingTop: spacing.xs,
    gap: 5
  },
  broadcastHistoryTitle: {
    color: '#b8d4ff',
    fontSize: 10,
    fontWeight: '800'
  },
  broadcastHistoryRow: {
    gap: 2
  },
  broadcastHistoryMain: {
    color: '#dfecff',
    fontSize: 10,
    fontWeight: '700'
  },
  broadcastHistoryMessage: {
    color: '#bed3f7',
    fontSize: 10
  },
  trendPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(95, 203, 179, 0.52)',
    backgroundColor: 'rgba(10, 77, 68, 0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  trendTitle: {
    color: '#bbf7ea',
    fontSize: 11,
    fontWeight: '800'
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(94, 203, 180, 0.28)',
    paddingTop: spacing.xs
  },
  trendRouteBlock: {
    flex: 1,
    gap: 2
  },
  trendRoute: {
    color: '#d7fff6',
    fontSize: 10,
    fontWeight: '700'
  },
  trendMeta: {
    color: '#9be6d6',
    fontSize: 9
  },
  trendMetricBlock: {
    width: 64,
    alignItems: 'flex-end'
  },
  trendWait: {
    color: '#b7fff0',
    fontSize: 13,
    fontWeight: '900'
  },
  trendOtp: {
    color: '#86efac',
    fontSize: 13,
    fontWeight: '900'
  },
  trendMetricLabel: {
    color: '#8fd1c2',
    fontSize: 9
  },
  policyPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(186, 230, 253, 0.5)',
    backgroundColor: 'rgba(23, 54, 88, 0.58)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  policyTitle: {
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '800'
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs
  },
  policyLabel: {
    color: '#bfdbfe',
    fontSize: 10,
    fontWeight: '700',
    flex: 1
  },
  policyChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.7)',
    backgroundColor: 'rgba(30, 64, 111, 0.72)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    minWidth: 124,
    alignItems: 'center'
  },
  policyChipEnabled: {
    borderColor: 'rgba(110, 231, 183, 0.74)',
    backgroundColor: 'rgba(4, 120, 87, 0.54)'
  },
  policyChipDisabled: {
    borderColor: 'rgba(253, 164, 175, 0.7)',
    backgroundColor: 'rgba(159, 18, 57, 0.45)'
  },
  policyChipText: {
    color: '#eff6ff',
    fontSize: 10,
    fontWeight: '700'
  },
  policyBanner: {
    color: '#dbeafe',
    fontSize: 10,
    lineHeight: 13
  },
  reportPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.52)',
    backgroundColor: 'rgba(61, 35, 112, 0.48)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  reportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs
  },
  reportTitle: {
    color: '#ede9fe',
    fontSize: 11,
    fontWeight: '800',
    flex: 1
  },
  reportButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(221, 214, 254, 0.75)',
    backgroundColor: 'rgba(109, 40, 217, 0.52)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    minWidth: 84,
    alignItems: 'center'
  },
  reportButtonText: {
    color: '#faf5ff',
    fontSize: 10,
    fontWeight: '700'
  },
  reportBanner: {
    color: '#ddd6fe',
    fontSize: 10,
    lineHeight: 13
  },
  reportSummaryCard: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(221, 214, 254, 0.42)',
    backgroundColor: 'rgba(76, 29, 149, 0.35)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2
  },
  reportSummaryTitle: {
    color: '#f5f3ff',
    fontSize: 10,
    fontWeight: '800'
  },
  reportSummaryLine: {
    color: '#e9d5ff',
    fontSize: 10
  },
  handoverPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(253, 224, 71, 0.52)',
    backgroundColor: 'rgba(113, 63, 18, 0.45)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  handoverTitle: {
    color: '#fef08a',
    fontSize: 11,
    fontWeight: '800'
  },
  handoverInput: {
    minHeight: 58,
    maxHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.6)',
    backgroundColor: 'rgba(120, 53, 15, 0.45)',
    color: '#fef9c3',
    fontSize: 12,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  handoverButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(253, 224, 71, 0.75)',
    backgroundColor: 'rgba(161, 98, 7, 0.58)',
    paddingVertical: 6,
    alignItems: 'center'
  },
  handoverButtonText: {
    color: '#fefce8',
    fontSize: 10,
    fontWeight: '700'
  },
  handoverBanner: {
    color: '#fef9c3',
    fontSize: 10,
    lineHeight: 13
  },
  handoverHistoryWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(250, 204, 21, 0.35)',
    paddingTop: spacing.xs,
    gap: 4
  },
  handoverHistoryTitle: {
    color: '#fde68a',
    fontSize: 10,
    fontWeight: '800'
  },
  handoverHistoryRow: {
    gap: 2
  },
  handoverHistoryMeta: {
    color: '#fcd34d',
    fontSize: 9
  },
  handoverHistoryText: {
    color: '#fef3c7',
    fontSize: 10
  },
  slaPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.5)',
    backgroundColor: 'rgba(124, 45, 18, 0.45)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  slaTitle: {
    color: '#fed7aa',
    fontSize: 11,
    fontWeight: '800'
  },
  slaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs
  },
  slaLabel: {
    color: '#fdba74',
    fontSize: 10,
    fontWeight: '700',
    flex: 1
  },
  slaChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(254, 215, 170, 0.72)',
    backgroundColor: 'rgba(154, 52, 18, 0.62)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    minWidth: 92,
    alignItems: 'center'
  },
  slaChipText: {
    color: '#fff7ed',
    fontSize: 10,
    fontWeight: '700'
  },
  slaBanner: {
    color: '#ffedd5',
    fontSize: 10,
    lineHeight: 13
  },
  slaBreachWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(254, 215, 170, 0.35)',
    paddingTop: spacing.xs,
    gap: 4
  },
  slaBreachTitle: {
    color: '#fdba74',
    fontSize: 10,
    fontWeight: '800'
  },
  slaNoBreach: {
    color: '#fed7aa',
    fontSize: 10
  },
  slaBreachLine: {
    color: '#ffedd5',
    fontSize: 10
  },
  auditPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.52)',
    backgroundColor: 'rgba(30, 41, 59, 0.56)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  auditTitle: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800'
  },
  auditInput: {
    minHeight: 56,
    maxHeight: 92,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.62)',
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    color: '#f8fafc',
    fontSize: 12,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  auditButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.75)',
    backgroundColor: 'rgba(51, 65, 85, 0.65)',
    paddingVertical: 6,
    alignItems: 'center'
  },
  auditButtonText: {
    color: '#f1f5f9',
    fontSize: 10,
    fontWeight: '700'
  },
  auditBanner: {
    color: '#cbd5e1',
    fontSize: 10,
    lineHeight: 13
  },
  auditFeedWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.35)',
    paddingTop: spacing.xs,
    gap: 4
  },
  auditFeedTitle: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '800'
  },
  auditEventRow: {
    gap: 2
  },
  auditEventMeta: {
    color: '#94a3b8',
    fontSize: 9
  },
  auditEventMessage: {
    color: '#e2e8f0',
    fontSize: 10
  },
  thcPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.48)',
    backgroundColor: 'rgba(20, 83, 45, 0.42)',
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
    color: '#dcfce7',
    fontSize: 11,
    fontWeight: '800',
    flex: 1
  },
  thcPercent: {
    color: '#86efac',
    fontSize: 12,
    fontWeight: '900'
  },
  thcItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  thcCheck: {
    width: 18,
    color: '#86efac',
    fontSize: 12,
    fontWeight: '900'
  },
  thcCheckDone: {
    color: '#4ade80'
  },
  thcItemLabel: {
    color: '#dcfce7',
    fontSize: 10,
    flex: 1
  },
  thcItemLabelDone: {
    color: '#bbf7d0'
  },
  thcResetButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.65)',
    backgroundColor: 'rgba(22, 101, 52, 0.55)',
    paddingVertical: 6,
    alignItems: 'center'
  },
  thcResetText: {
    color: '#f0fdf4',
    fontSize: 10,
    fontWeight: '700'
  },
  thcSignOffButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.72)',
    backgroundColor: 'rgba(22, 163, 74, 0.48)',
    paddingVertical: 6,
    alignItems: 'center'
  },
  thcSignOffText: {
    color: '#f0fdf4',
    fontSize: 10,
    fontWeight: '800'
  },
  thcBanner: {
    color: '#bbf7d0',
    fontSize: 10,
    lineHeight: 13
  },
  thcSignOffMeta: {
    color: '#dcfce7',
    fontSize: 10
  },
  thcArchiveWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 222, 128, 0.35)',
    paddingTop: spacing.xs,
    gap: 3
  },
  thcArchiveTitle: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '800'
  },
  thcArchiveLine: {
    color: '#dcfce7',
    fontSize: 10
  },
  thcBlockerWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 222, 128, 0.28)',
    paddingTop: spacing.xs,
    gap: 4
  },
  thcBlockerTitle: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '800'
  },
  thcBlockerLine: {
    color: '#dcfce7',
    fontSize: 10
  },
  thcOverrideButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(187, 247, 208, 0.62)',
    backgroundColor: 'rgba(22, 101, 52, 0.45)',
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 2
  },
  thcOverrideText: {
    color: '#f0fdf4',
    fontSize: 10,
    fontWeight: '700'
  },
  thcPackageWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 222, 128, 0.28)',
    paddingTop: spacing.xs,
    gap: 4
  },
  thcPackageButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.72)',
    backgroundColor: 'rgba(21, 128, 61, 0.5)',
    paddingVertical: 6,
    alignItems: 'center'
  },
  thcPackageButtonText: {
    color: '#f0fdf4',
    fontSize: 10,
    fontWeight: '700'
  },
  thcPackageRef: {
    color: '#bbf7d0',
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
    borderColor: 'rgba(134, 239, 172, 0.6)',
    backgroundColor: 'rgba(22, 101, 52, 0.45)',
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
    alignItems: 'center'
  },
  thcDispatchRecipientText: {
    color: '#dcfce7',
    fontSize: 10,
    fontWeight: '700'
  },
  thcDispatchButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.72)',
    backgroundColor: 'rgba(21, 128, 61, 0.55)',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    alignItems: 'center'
  },
  thcDispatchButtonText: {
    color: '#f0fdf4',
    fontSize: 10,
    fontWeight: '700'
  },
  thcDispatchBanner: {
    color: '#bbf7d0',
    fontSize: 10,
    lineHeight: 13
  },
  thcDispatchPending: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '700'
  },
  thcDispatchHistoryWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 222, 128, 0.28)',
    paddingTop: spacing.xs,
    gap: 3
  },
  thcDispatchHistoryTitle: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '800'
  },
  thcDispatchHistoryLine: {
    color: '#dcfce7',
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
    borderColor: 'rgba(134, 239, 172, 0.68)',
    backgroundColor: 'rgba(22, 101, 52, 0.45)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  thcDispatchAckButtonText: {
    color: '#f0fdf4',
    fontSize: 9,
    fontWeight: '700'
  },
  thcDispatchRemindButton: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(187, 247, 208, 0.65)',
    backgroundColor: 'rgba(21, 128, 61, 0.35)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  thcDispatchRemindText: {
    color: '#dcfce7',
    fontSize: 9,
    fontWeight: '700'
  },
  thcDispatchEscalateButton: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(254, 202, 202, 0.68)',
    backgroundColor: 'rgba(153, 27, 27, 0.45)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  thcDispatchEscalateText: {
    color: '#fee2e2',
    fontSize: 9,
    fontWeight: '700'
  },
  thcDispatchReminderMeta: {
    color: '#86efac',
    fontSize: 9
  },
  thcDispatchEscalatedMeta: {
    color: '#fecaca',
    fontSize: 9,
    fontWeight: '700'
  },
  thcDispatchAcked: {
    color: '#86efac',
    fontSize: 9,
    fontWeight: '700'
  },
  thcCloseButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.72)',
    backgroundColor: 'rgba(22, 163, 74, 0.5)',
    paddingVertical: 6,
    alignItems: 'center'
  },
  thcCloseButtonText: {
    color: '#f0fdf4',
    fontSize: 10,
    fontWeight: '800'
  },
  thcClosedMeta: {
    color: '#bbf7d0',
    fontSize: 10,
    textAlign: 'center'
  },
  thcClosureHistoryWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 222, 128, 0.24)',
    paddingTop: spacing.xs,
    gap: 3
  },
  thcClosureHistoryTitle: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '800'
  },
  thcClosureHistoryLine: {
    color: '#dcfce7',
    fontSize: 10
  },
  thcReopenWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 222, 128, 0.28)',
    paddingTop: spacing.xs,
    gap: 4
  },
  thcReopenTitle: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '800'
  },
  thcReopenInput: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.62)',
    backgroundColor: 'rgba(21, 128, 61, 0.28)',
    color: '#f0fdf4',
    fontSize: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  thcReopenButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.72)',
    backgroundColor: 'rgba(22, 163, 74, 0.5)',
    paddingVertical: 6,
    alignItems: 'center'
  },
  thcReopenButtonText: {
    color: '#f0fdf4',
    fontSize: 10,
    fontWeight: '700'
  },
  thcReopenBanner: {
    color: '#bbf7d0',
    fontSize: 10,
    lineHeight: 13
  },
  thcReopenHistoryWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 222, 128, 0.24)',
    paddingTop: spacing.xs,
    gap: 3
  },
  thcReopenHistoryTitle: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '800'
  },
  thcReopenHistoryLine: {
    color: '#dcfce7',
    fontSize: 10
  },
  thcInsightsWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 222, 128, 0.24)',
    paddingTop: spacing.xs,
    gap: 2
  },
  thcInsightsTitle: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '800'
  },
  thcInsightsLine: {
    color: '#dcfce7',
    fontSize: 10
  },
  thcInsightsSummary: {
    color: '#bbf7d0',
    fontSize: 9,
    lineHeight: 12
  },
  thcActionPlanWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 222, 128, 0.24)',
    paddingTop: spacing.xs,
    gap: 3
  },
  thcActionPlanTitle: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '800'
  },
  thcActionPlanStatus: {
    color: '#bbf7d0',
    fontSize: 10,
    fontWeight: '700'
  },
  thcActionPlanLine: {
    color: '#dcfce7',
    fontSize: 10
  },
  thcAgingWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 222, 128, 0.24)',
    paddingTop: spacing.xs,
    gap: 2
  },
  thcAgingTitle: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '800'
  },
  thcAgingLine: {
    color: '#dcfce7',
    fontSize: 10
  },
  thcAgingSeverity: {
    color: '#bbf7d0',
    fontSize: 10,
    fontWeight: '700'
  }
});
