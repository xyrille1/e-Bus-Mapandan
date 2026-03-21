import { useEffect, useMemo, useState } from 'react';

type FleetBusRow = {
  id: string;
  route: string;
  status: 'Active' | 'Delayed' | 'Offline';
  occupancyPercent: number;
  adherencePercent: number;
};

type FleetState = {
  rows: FleetBusRow[];
  incidentQueue: Array<{
    id: string;
    busId: string;
    type: 'Traffic' | 'Breakdown' | 'Medical' | 'Security';
    severity: 'Low' | 'Medium' | 'High';
    note: string;
    reportedAt: string;
    acknowledged: boolean;
  }>;
  alertsToday: number;
  avgWaitMins: number;
  activeTrips: number;
  lastUpdatedAt: string;
  broadcastTarget: 'All Riders' | 'Northbound' | 'Southbound';
  broadcastDraft: string;
  broadcastStatus: 'idle' | 'sending' | 'sent' | 'failed';
  broadcastBanner: string | null;
  broadcastHistory: Array<{
    id: string;
    target: 'All Riders' | 'Northbound' | 'Southbound';
    message: string;
    at: string;
  }>;
  routeTrends: Array<{
    route: string;
    avgWaitHistory: number[];
    otpHistory: number[];
  }>;
  dispatchMode: 'Balanced' | 'Wait-Time Priority' | 'Adherence Priority';
  peakHourPolicy: 'Normal' | 'Headway Boost' | 'Express Bias';
  autoRecoveryEnabled: boolean;
  policyBanner: string | null;
  reportStatus: 'idle' | 'generating' | 'ready';
  reportBanner: string | null;
  lastReportSnapshot: {
    generatedAt: string;
    activeTrips: number;
    avgWaitMins: number;
    pendingIncidents: number;
    fleetHealth: string;
  } | null;
  handoverNoteDraft: string;
  handoverStatus: 'idle' | 'saving' | 'saved' | 'failed';
  handoverBanner: string | null;
  handoverHistory: Array<{
    id: string;
    note: string;
    at: string;
  }>;
  slaWaitThresholdMins: 8 | 10 | 12;
  slaOtpThresholdPercent: 80 | 85 | 90;
  slaBanner: string | null;
  auditNoteDraft: string;
  auditStatus: 'idle' | 'saving' | 'saved' | 'failed';
  auditBanner: string | null;
  auditEvents: Array<{
    id: string;
    actor: 'System' | 'Dispatcher';
    message: string;
    at: string;
  }>;
  thcItems: Array<{
    id: string;
    label: string;
    done: boolean;
  }>;
  thcBanner: string | null;
  thcSignOffStatus: 'idle' | 'signed';
  thcSignedOffBy: string | null;
  thcSignedOffAt: string | null;
  thcArchive: Array<{
    id: string;
    signedOffBy: string;
    signedOffAt: string;
    completionPercent: number;
  }>;
  thcOverrideEnabled: boolean;
  thcPackageStatus: 'idle' | 'generating' | 'ready';
  thcPackageRef: string | null;
  thcDispatchRecipient: 'Operations Head' | 'Night Shift Lead' | 'Depot Supervisor';
  thcDispatchStatus: 'idle' | 'sending' | 'sent' | 'failed';
  thcDispatchBanner: string | null;
  thcDispatchHistory: Array<{
    id: string;
    packageRef: string;
    recipient: string;
    at: string;
    acknowledged: boolean;
    acknowledgedAt: string | null;
    reminderCount: number;
    escalated: boolean;
    escalatedAt: string | null;
  }>;
  thcTurnoverStatus: 'open' | 'closed';
  thcClosedAt: string | null;
  thcReopenReasonDraft: string;
  thcReopenBanner: string | null;
  thcReopenHistory: Array<{
    id: string;
    reason: string;
    at: string;
  }>;
  thcClosureAttempts: Array<{
    id: string;
    at: string;
    status: 'Blocked' | 'Closed';
    reason: string;
  }>;
};

const TICK_MS = 6000;

const initialRows: FleetBusRow[] = [
  { id: 'BUS-102', route: 'Manaoag-Dagupan', status: 'Active', occupancyPercent: 52, adherencePercent: 93 },
  { id: 'BUS-103', route: 'Manaoag-Dagupan', status: 'Delayed', occupancyPercent: 67, adherencePercent: 78 },
  { id: 'BUS-111', route: 'Mapandan-Urdaneta', status: 'Active', occupancyPercent: 44, adherencePercent: 90 },
  { id: 'BUS-118', route: 'Mapandan-Dagupan', status: 'Offline', occupancyPercent: 0, adherencePercent: 0 }
];

export function useAdminFleetOverview() {
  const [state, setState] = useState<FleetState>({
    rows: initialRows,
    incidentQueue: [
      {
        id: 'INC-9001',
        busId: 'BUS-103',
        type: 'Traffic',
        severity: 'Medium',
        note: 'Heavy queue near Urdaneta Junction',
        reportedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        acknowledged: false
      },
      {
        id: 'INC-9002',
        busId: 'BUS-118',
        type: 'Breakdown',
        severity: 'High',
        note: 'Engine fault, unit pulled to shoulder lane',
        reportedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        acknowledged: false
      }
    ],
    alertsToday: 5,
    avgWaitMins: 8,
    activeTrips: 13,
    lastUpdatedAt: new Date().toISOString(),
    broadcastTarget: 'All Riders',
    broadcastDraft: '',
    broadcastStatus: 'idle',
    broadcastBanner: null,
    broadcastHistory: [],
    routeTrends: [
      { route: 'Manaoag-Dagupan', avgWaitHistory: [8, 7, 9, 8], otpHistory: [90, 92, 88, 91] },
      { route: 'Mapandan-Urdaneta', avgWaitHistory: [7, 6, 7, 8], otpHistory: [93, 95, 92, 90] },
      { route: 'Mapandan-Dagupan', avgWaitHistory: [10, 11, 9, 10], otpHistory: [84, 81, 86, 83] }
    ],
    dispatchMode: 'Balanced',
    peakHourPolicy: 'Normal',
    autoRecoveryEnabled: true,
    policyBanner: null,
    reportStatus: 'idle',
    reportBanner: null,
    lastReportSnapshot: null,
    handoverNoteDraft: '',
    handoverStatus: 'idle',
    handoverBanner: null,
    handoverHistory: [],
    slaWaitThresholdMins: 10,
    slaOtpThresholdPercent: 85,
    slaBanner: null,
    auditNoteDraft: '',
    auditStatus: 'idle',
    auditBanner: null,
    auditEvents: [
      {
        id: 'AUD-1001',
        actor: 'System',
        message: 'Morning sync completed for all active routes',
        at: new Date(Date.now() - 35 * 60 * 1000).toISOString()
      },
      {
        id: 'AUD-1002',
        actor: 'Dispatcher',
        message: 'Manual dispatch override applied to BUS-103',
        at: new Date(Date.now() - 18 * 60 * 1000).toISOString()
      }
    ],
    thcItems: [
      { id: 'THC-1', label: 'Review pending incidents', done: false },
      { id: 'THC-2', label: 'Generate daily snapshot', done: false },
      { id: 'THC-3', label: 'Save shift handover note', done: false },
      { id: 'THC-4', label: 'Confirm SLA guardrails', done: false }
    ],
    thcBanner: null,
    thcSignOffStatus: 'idle',
    thcSignedOffBy: null,
    thcSignedOffAt: null,
    thcArchive: [],
    thcOverrideEnabled: false,
    thcPackageStatus: 'idle',
    thcPackageRef: null,
    thcDispatchRecipient: 'Operations Head',
    thcDispatchStatus: 'idle',
    thcDispatchBanner: null,
    thcDispatchHistory: [],
    thcTurnoverStatus: 'open',
    thcClosedAt: null,
    thcReopenReasonDraft: '',
    thcReopenBanner: null,
    thcReopenHistory: [],
    thcClosureAttempts: []
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        const nextRows = prev.rows.map((row, index) => {
          if (row.status === 'Offline' && Math.random() < 0.2) {
            return {
              ...row,
              status: 'Active' as const,
              occupancyPercent: 22,
              adherencePercent: 86
            };
          }

          const nextOccupancy = Math.max(0, Math.min(99, row.occupancyPercent + (Math.random() > 0.5 ? 5 : -4)));
          const nextAdherence = Math.max(0, Math.min(99, row.adherencePercent + (Math.random() > 0.55 ? 3 : -2)));
          const nextStatus: FleetBusRow['status'] =
            nextAdherence < 70 ? 'Delayed' : row.status === 'Offline' ? 'Offline' : 'Active';

          if (index === 3 && Math.random() < 0.18) {
            return {
              ...row,
              status: 'Offline' as const,
              occupancyPercent: 0,
              adherencePercent: 0
            };
          }

          return {
            ...row,
            status: nextStatus,
            occupancyPercent: row.status === 'Offline' ? 0 : nextOccupancy,
            adherencePercent: row.status === 'Offline' ? 0 : nextAdherence
          };
        });

        const delayedCount = nextRows.filter((row) => row.status === 'Delayed').length;
        const offlineCount = nextRows.filter((row) => row.status === 'Offline').length;
        const queueWithAutoAcks = prev.incidentQueue.map((incident) =>
          incident.acknowledged || Math.random() > 0.06
            ? incident
            : { ...incident, acknowledged: true }
        );

        return {
          ...prev,
          rows: nextRows,
          incidentQueue: queueWithAutoAcks,
          auditEvents:
            Math.random() < 0.22
              ? [
                  {
                    id: `AUD-${Date.now()}`,
                    actor: 'System' as const,
                    message: delayedCount > 1
                      ? 'SLA watch triggered for delayed routes'
                      : 'Automatic telemetry integrity check passed',
                    at: new Date().toISOString()
                  },
                  ...prev.auditEvents
                ].slice(0, 8)
              : prev.auditEvents,
          routeTrends: prev.routeTrends.map((trend) => {
            const lastWait = trend.avgWaitHistory[trend.avgWaitHistory.length - 1] ?? 8;
            const lastOtp = trend.otpHistory[trend.otpHistory.length - 1] ?? 90;
            const nextWait = Math.max(4, Math.min(18, lastWait + (Math.random() > 0.55 ? 1 : -1)));
            const nextOtp = Math.max(70, Math.min(99, lastOtp + (Math.random() > 0.5 ? 1 : -2)));

            return {
              ...trend,
              avgWaitHistory: [...trend.avgWaitHistory, nextWait].slice(-6),
              otpHistory: [...trend.otpHistory, nextOtp].slice(-6)
            };
          }),
          alertsToday: Math.max(2, prev.alertsToday + (Math.random() > 0.7 ? 1 : 0)),
          avgWaitMins: Math.max(5, Math.min(18, prev.avgWaitMins + delayedCount - offlineCount > 1 ? 1 : -1)),
          activeTrips: Math.max(6, 16 - offlineCount),
          lastUpdatedAt: new Date().toISOString()
        };
      });
    }, TICK_MS);

    return () => clearInterval(timer);
  }, []);

  const fleetHealth = useMemo(() => {
    const delayed = state.rows.filter((row) => row.status === 'Delayed').length;
    const offline = state.rows.filter((row) => row.status === 'Offline').length;

    if (offline > 0) {
      return 'At Risk';
    }

    if (delayed > 1) {
      return 'Watch';
    }

    return 'Good';
  }, [state.rows]);

  const pendingIncidents = useMemo(
    () => state.incidentQueue.filter((incident) => !incident.acknowledged).length,
    [state.incidentQueue]
  );

  const thcCompletionPercent = useMemo(() => {
    const completed = state.thcItems.filter((item) => item.done).length;
    if (state.thcItems.length === 0) {
      return 0;
    }

    return Math.round((completed / state.thcItems.length) * 100);
  }, [state.thcItems]);

  const routeTrendSummary = useMemo(
    () =>
      state.routeTrends.map((trend) => {
        const avgWait =
          trend.avgWaitHistory.reduce((acc, value) => acc + value, 0) / trend.avgWaitHistory.length;
        const avgOtp = trend.otpHistory.reduce((acc, value) => acc + value, 0) / trend.otpHistory.length;

        return {
          route: trend.route,
          avgWaitMins: Math.round(avgWait),
          otpPercent: Math.round(avgOtp),
          trendSignal:
            trend.avgWaitHistory[trend.avgWaitHistory.length - 1] <= trend.avgWaitHistory[0]
              ? 'Improving'
              : 'Needs Attention'
        };
      }),
    [state.routeTrends]
  );

  const slaBreaches = useMemo(
    () =>
      routeTrendSummary.filter(
        (trend) =>
          trend.avgWaitMins > state.slaWaitThresholdMins ||
          trend.otpPercent < state.slaOtpThresholdPercent
      ),
    [routeTrendSummary, state.slaOtpThresholdPercent, state.slaWaitThresholdMins]
  );

  const thcBlockers = useMemo(() => {
    const blockers: string[] = [];

    if (pendingIncidents > 0) {
      blockers.push(`${pendingIncidents} pending incidents`);
    }

    if (slaBreaches.length > 0) {
      blockers.push(`${slaBreaches.length} SLA breaches`);
    }

    return blockers;
  }, [pendingIncidents, slaBreaches]);

  const acknowledgeIncident = (incidentId: string) => {
    setState((prev) => ({
      ...prev,
      incidentQueue: prev.incidentQueue.map((incident) =>
        incident.id === incidentId ? { ...incident, acknowledged: true } : incident
      )
    }));
  };

  const cycleBroadcastTarget = () => {
    setState((prev) => {
      const options: Array<'All Riders' | 'Northbound' | 'Southbound'> = [
        'All Riders',
        'Northbound',
        'Southbound'
      ];
      const currentIndex = options.findIndex((option) => option === prev.broadcastTarget);
      const nextIndex = (currentIndex + 1) % options.length;

      return {
        ...prev,
        broadcastTarget: options[nextIndex]
      };
    });
  };

  const setBroadcastDraft = (message: string) => {
    setState((prev) => ({
      ...prev,
      broadcastDraft: message,
      broadcastStatus: prev.broadcastStatus === 'failed' ? 'idle' : prev.broadcastStatus,
      broadcastBanner: prev.broadcastStatus === 'failed' ? null : prev.broadcastBanner
    }));
  };

  const sendBroadcast = async () => {
    if (state.broadcastDraft.trim().length < 8) {
      setState((prev) => ({
        ...prev,
        broadcastStatus: 'failed',
        broadcastBanner: 'Broadcast message must be at least 8 characters.'
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      broadcastStatus: 'sending',
      broadcastBanner: 'Sending advisory to rider devices...'
    }));

    await new Promise((resolve) => setTimeout(resolve, 650));

    setState((prev) => ({
      ...prev,
      broadcastStatus: 'sent',
      broadcastBanner: `Broadcast sent to ${prev.broadcastTarget} at ${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      broadcastHistory: [
        {
          id: `BCAST-${Date.now()}`,
          target: prev.broadcastTarget,
          message: prev.broadcastDraft.trim(),
          at: new Date().toISOString()
        },
        ...prev.broadcastHistory
      ].slice(0, 4),
      broadcastDraft: ''
    }));
  };

  const cycleDispatchMode = () => {
    setState((prev) => {
      const options: Array<'Balanced' | 'Wait-Time Priority' | 'Adherence Priority'> = [
        'Balanced',
        'Wait-Time Priority',
        'Adherence Priority'
      ];
      const currentIndex = options.findIndex((option) => option === prev.dispatchMode);
      const nextIndex = (currentIndex + 1) % options.length;

      return {
        ...prev,
        dispatchMode: options[nextIndex],
        policyBanner: `Dispatch mode set to ${options[nextIndex]}`
      };
    });
  };

  const cyclePeakHourPolicy = () => {
    setState((prev) => {
      const options: Array<'Normal' | 'Headway Boost' | 'Express Bias'> = [
        'Normal',
        'Headway Boost',
        'Express Bias'
      ];
      const currentIndex = options.findIndex((option) => option === prev.peakHourPolicy);
      const nextIndex = (currentIndex + 1) % options.length;

      return {
        ...prev,
        peakHourPolicy: options[nextIndex],
        policyBanner: `Peak-hour policy set to ${options[nextIndex]}`
      };
    });
  };

  const toggleAutoRecovery = () => {
    setState((prev) => ({
      ...prev,
      autoRecoveryEnabled: !prev.autoRecoveryEnabled,
      policyBanner: `Auto-recovery ${!prev.autoRecoveryEnabled ? 'enabled' : 'disabled'}`
    }));
  };

  const generateDailyReportSnapshot = async () => {
    setState((prev) => ({
      ...prev,
      reportStatus: 'generating',
      reportBanner: 'Generating daily operations snapshot...'
    }));

    await new Promise((resolve) => setTimeout(resolve, 700));

    setState((prev) => {
      const delayed = prev.rows.filter((row) => row.status === 'Delayed').length;
      const offline = prev.rows.filter((row) => row.status === 'Offline').length;
      const pending = prev.incidentQueue.filter((incident) => !incident.acknowledged).length;
      const health = offline > 0 ? 'At Risk' : delayed > 1 ? 'Watch' : 'Good';

      return {
        ...prev,
        reportStatus: 'ready',
        reportBanner: `Snapshot ready at ${new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}`,
        lastReportSnapshot: {
          generatedAt: new Date().toISOString(),
          activeTrips: prev.activeTrips,
          avgWaitMins: prev.avgWaitMins,
          pendingIncidents: pending,
          fleetHealth: health
        }
      };
    });
  };

  const setHandoverNoteDraft = (note: string) => {
    setState((prev) => ({
      ...prev,
      handoverNoteDraft: note,
      handoverStatus: prev.handoverStatus === 'failed' ? 'idle' : prev.handoverStatus,
      handoverBanner: prev.handoverStatus === 'failed' ? null : prev.handoverBanner
    }));
  };

  const saveHandoverNote = async () => {
    if (state.handoverNoteDraft.trim().length < 8) {
      setState((prev) => ({
        ...prev,
        handoverStatus: 'failed',
        handoverBanner: 'Handover note must be at least 8 characters.'
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      handoverStatus: 'saving',
      handoverBanner: 'Saving shift handover note...'
    }));

    await new Promise((resolve) => setTimeout(resolve, 500));

    setState((prev) => ({
      ...prev,
      handoverStatus: 'saved',
      handoverBanner: `Handover saved at ${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      handoverHistory: [
        {
          id: `HANDOVER-${Date.now()}`,
          note: prev.handoverNoteDraft.trim(),
          at: new Date().toISOString()
        },
        ...prev.handoverHistory
      ].slice(0, 4),
      handoverNoteDraft: ''
    }));
  };

  const cycleSlaWaitThreshold = () => {
    setState((prev) => {
      const options: Array<8 | 10 | 12> = [8, 10, 12];
      const currentIndex = options.findIndex((option) => option === prev.slaWaitThresholdMins);
      const nextIndex = (currentIndex + 1) % options.length;

      return {
        ...prev,
        slaWaitThresholdMins: options[nextIndex],
        slaBanner: `SLA wait threshold set to ${options[nextIndex]} mins`
      };
    });
  };

  const cycleSlaOtpThreshold = () => {
    setState((prev) => {
      const options: Array<80 | 85 | 90> = [80, 85, 90];
      const currentIndex = options.findIndex((option) => option === prev.slaOtpThresholdPercent);
      const nextIndex = (currentIndex + 1) % options.length;

      return {
        ...prev,
        slaOtpThresholdPercent: options[nextIndex],
        slaBanner: `SLA OTP threshold set to ${options[nextIndex]}%`
      };
    });
  };

  const setAuditNoteDraft = (note: string) => {
    setState((prev) => ({
      ...prev,
      auditNoteDraft: note,
      auditStatus: prev.auditStatus === 'failed' ? 'idle' : prev.auditStatus,
      auditBanner: prev.auditStatus === 'failed' ? null : prev.auditBanner
    }));
  };

  const saveAuditNote = async () => {
    if (state.auditNoteDraft.trim().length < 8) {
      setState((prev) => ({
        ...prev,
        auditStatus: 'failed',
        auditBanner: 'Audit note must be at least 8 characters.'
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      auditStatus: 'saving',
      auditBanner: 'Logging dispatch audit note...'
    }));

    await new Promise((resolve) => setTimeout(resolve, 450));

    setState((prev) => ({
      ...prev,
      auditStatus: 'saved',
      auditBanner: `Audit note logged at ${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          actor: 'Dispatcher' as const,
          message: prev.auditNoteDraft.trim(),
          at: new Date().toISOString()
        },
        ...prev.auditEvents
      ].slice(0, 8),
      auditNoteDraft: ''
    }));
  };

  const toggleThcItem = (itemId: string) => {
    setState((prev) => {
      if (prev.thcSignOffStatus === 'signed') {
        return {
          ...prev,
          thcBanner: 'Checklist is signed off. Reset to edit.'
        };
      }

      const nextItems = prev.thcItems.map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item
      );

      const completed = nextItems.filter((item) => item.done).length;

      return {
        ...prev,
        thcItems: nextItems,
        thcBanner: `${completed}/${nextItems.length} checklist items complete`
      };
    });
  };

  const resetThcChecklist = () => {
    setState((prev) => ({
      ...prev,
      thcItems: prev.thcItems.map((item) => ({ ...item, done: false })),
      thcBanner: 'Checklist reset for next turnover',
      thcSignOffStatus: 'idle',
      thcSignedOffBy: null,
      thcSignedOffAt: null,
      thcPackageStatus: 'idle',
      thcPackageRef: null,
      thcDispatchStatus: 'idle',
      thcDispatchBanner: null,
      thcTurnoverStatus: 'open',
      thcClosedAt: null,
      thcReopenReasonDraft: '',
      thcReopenBanner: null
    }));
  };

  const signOffThcChecklist = () => {
    setState((prev) => {
      const completed = prev.thcItems.filter((item) => item.done).length;
      const blockingIssues: string[] = [];

      if (pendingIncidents > 0) {
        blockingIssues.push(`${pendingIncidents} pending incidents`);
      }

      if (slaBreaches.length > 0) {
        blockingIssues.push(`${slaBreaches.length} SLA breaches`);
      }

      if (completed !== prev.thcItems.length) {
        return {
          ...prev,
          thcBanner: 'Complete all checklist items before sign-off.'
        };
      }

      if (blockingIssues.length > 0 && !prev.thcOverrideEnabled) {
        return {
          ...prev,
          thcBanner: `Resolve blockers first: ${blockingIssues.join(', ')}`
        };
      }

      return {
        ...prev,
        thcSignOffStatus: 'signed',
        thcSignedOffBy: 'Dispatcher Lead',
        thcSignedOffAt: new Date().toISOString(),
        thcBanner: 'Checklist signed off and locked.',
        thcArchive: [
          {
            id: `THC-ARCHIVE-${Date.now()}`,
            signedOffBy: 'Dispatcher Lead',
            signedOffAt: new Date().toISOString(),
            completionPercent: 100
          },
          ...prev.thcArchive
        ].slice(0, 6)
      };
    });
  };

  const toggleThcOverride = () => {
    setState((prev) => ({
      ...prev,
      thcOverrideEnabled: !prev.thcOverrideEnabled,
      thcBanner: !prev.thcOverrideEnabled
        ? 'Override enabled for blocker sign-off'
        : 'Override disabled'
    }));
  };

  const generateThcPackage = async () => {
    if (state.thcSignOffStatus !== 'signed') {
      setState((prev) => ({
        ...prev,
        thcBanner: 'Sign off checklist before generating package.'
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      thcPackageStatus: 'generating',
      thcBanner: 'Generating THC handover package...'
    }));

    await new Promise((resolve) => setTimeout(resolve, 500));

    setState((prev) => ({
      ...prev,
      thcPackageStatus: 'ready',
      thcPackageRef: `THC-PKG-${Date.now().toString().slice(-6)}`,
      thcBanner: 'THC package ready for turnover.',
      thcDispatchStatus: 'idle',
      thcDispatchBanner: null
    }));
  };

  const cycleThcDispatchRecipient = () => {
    setState((prev) => {
      const options: Array<'Operations Head' | 'Night Shift Lead' | 'Depot Supervisor'> = [
        'Operations Head',
        'Night Shift Lead',
        'Depot Supervisor'
      ];
      const currentIndex = options.findIndex((option) => option === prev.thcDispatchRecipient);
      const nextIndex = (currentIndex + 1) % options.length;

      return {
        ...prev,
        thcDispatchRecipient: options[nextIndex]
      };
    });
  };

  const dispatchThcPackage = async () => {
    if (!state.thcPackageRef) {
      setState((prev) => ({
        ...prev,
        thcDispatchStatus: 'failed',
        thcDispatchBanner: 'Generate THC package before dispatch.'
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      thcDispatchStatus: 'sending',
      thcDispatchBanner: `Sending ${prev.thcPackageRef} to ${prev.thcDispatchRecipient}...`
    }));

    await new Promise((resolve) => setTimeout(resolve, 550));

    setState((prev) => ({
      ...prev,
      thcDispatchStatus: 'sent',
      thcDispatchBanner: `Package ${prev.thcPackageRef} sent to ${prev.thcDispatchRecipient}`,
      thcDispatchHistory: [
        {
          id: `THC-DISPATCH-${Date.now()}`,
          packageRef: prev.thcPackageRef ?? 'N/A',
          recipient: prev.thcDispatchRecipient,
          at: new Date().toISOString(),
          acknowledged: false,
          acknowledgedAt: null,
          reminderCount: 0,
          escalated: false,
          escalatedAt: null
        },
        ...prev.thcDispatchHistory
      ].slice(0, 5)
    }));
  };

  const sendThcDispatchReminder = (dispatchId: string) => {
    setState((prev) => {
      const target = prev.thcDispatchHistory.find((entry) => entry.id === dispatchId);

      if (!target || target.acknowledged) {
        return prev;
      }

      return {
        ...prev,
        thcDispatchHistory: prev.thcDispatchHistory.map((entry) =>
          entry.id === dispatchId
            ? {
                ...entry,
                reminderCount: entry.reminderCount + 1
              }
            : entry
        ),
        thcDispatchBanner: `Reminder sent to ${target.recipient} for ${target.packageRef}`
      };
    });
  };

  const acknowledgeThcDispatch = (dispatchId: string) => {
    setState((prev) => ({
      ...prev,
      thcDispatchHistory: prev.thcDispatchHistory.map((entry) =>
        entry.id === dispatchId && !entry.acknowledged
          ? {
              ...entry,
              acknowledged: true,
              acknowledgedAt: new Date().toISOString()
            }
          : entry
      ),
      thcDispatchBanner: 'Dispatch receipt acknowledged.'
    }));
  };

  const escalateThcDispatch = (dispatchId: string) => {
    setState((prev) => {
      const target = prev.thcDispatchHistory.find((entry) => entry.id === dispatchId);

      if (!target || target.acknowledged || target.escalated) {
        return prev;
      }

      return {
        ...prev,
        thcDispatchHistory: prev.thcDispatchHistory.map((entry) =>
          entry.id === dispatchId
            ? {
                ...entry,
                escalated: true,
                escalatedAt: new Date().toISOString()
              }
            : entry
        ),
        thcDispatchBanner: `Escalated ${target.packageRef} to Operations Head`
      };
    });
  };

  const thcPendingReceipts = useMemo(
    () => state.thcDispatchHistory.filter((entry) => !entry.acknowledged).length,
    [state.thcDispatchHistory]
  );

  const thcInsights = useMemo(() => {
    const totalDispatches = state.thcDispatchHistory.length;
    const acknowledgedCount = state.thcDispatchHistory.filter((entry) => entry.acknowledged).length;
    const escalatedCount = state.thcDispatchHistory.filter((entry) => entry.escalated).length;
    const totalReminders = state.thcDispatchHistory.reduce(
      (acc, entry) => acc + entry.reminderCount,
      0
    );

    return {
      totalDispatches,
      acknowledgedCount,
      escalatedCount,
      avgRemindersPerDispatch:
        totalDispatches > 0 ? Number((totalReminders / totalDispatches).toFixed(1)) : 0,
      ackRatePercent:
        totalDispatches > 0
          ? Math.round((acknowledgedCount / totalDispatches) * 100)
          : 0
    };
  }, [state.thcDispatchHistory]);

  const thcReadiness = useMemo(() => {
    const issues: string[] = [];

    if (state.thcSignOffStatus !== 'signed') {
      issues.push('Checklist not signed off');
    }

    if (!state.thcPackageRef) {
      issues.push('THC package not generated');
    }

    if (thcPendingReceipts > 0) {
      issues.push(`${thcPendingReceipts} pending receipt(s)`);
    }

    if (thcBlockers.length > 0) {
      issues.push(...thcBlockers);
    }

    const baseScore = 100;
    const issuePenalty = issues.length * 18;
    const completionPenalty = Math.round((100 - thcCompletionPercent) * 0.2);
    const score = Math.max(0, baseScore - issuePenalty - completionPenalty);

    const level: 'Ready' | 'Watch' | 'At Risk' =
      score >= 80 ? 'Ready' : score >= 50 ? 'Watch' : 'At Risk';

    return {
      score,
      level,
      summary:
        issues.length === 0
          ? 'Turnover conditions are clear for closure.'
          : `Action needed: ${issues.join(', ')}`
    };
  }, [
    state.thcPackageRef,
    state.thcSignOffStatus,
    thcBlockers,
    thcCompletionPercent,
    thcPendingReceipts
  ]);

  const thcActionPlan = useMemo(() => {
    const actions: string[] = [];

    if (state.thcSignOffStatus !== 'signed') {
      actions.push('Complete checklist and sign off with dispatcher lead');
    }

    if (!state.thcPackageRef) {
      actions.push('Generate THC package reference for turnover handoff');
    }

    if (thcPendingReceipts > 0) {
      actions.push(`Resolve ${thcPendingReceipts} pending dispatch receipt(s)`);
    }

    if (pendingIncidents > 0) {
      actions.push(`Acknowledge ${pendingIncidents} pending incident(s)`);
    }

    if (slaBreaches.length > 0) {
      actions.push(`Stabilize ${slaBreaches.length} SLA breach route(s)`);
    }

    const closureEtaMins = actions.length === 0 ? 0 : Math.min(45, actions.length * 8);

    return {
      hasActions: actions.length > 0,
      actions,
      closureEtaMins,
      statusLine:
        actions.length === 0
          ? 'Turnover can be closed now.'
          : `Estimated ${closureEtaMins} min(s) to closure.`
    };
  }, [pendingIncidents, slaBreaches.length, state.thcPackageRef, state.thcSignOffStatus, thcPendingReceipts]);

  const thcReceiptAging = useMemo(() => {
    const pending = state.thcDispatchHistory.filter((entry) => !entry.acknowledged);

    if (pending.length === 0) {
      return {
        pendingCount: 0,
        oldestPendingMins: 0,
        avgPendingMins: 0,
        overdueCount: 0,
        severity: 'Healthy' as const
      };
    }

    const ages = pending.map((entry) => {
      const ageMins = Math.max(
        0,
        Math.round((Date.now() - new Date(entry.at).getTime()) / 60000)
      );
      return ageMins;
    });

    const oldestPendingMins = Math.max(...ages);
    const avgPendingMins = Math.round(ages.reduce((acc, mins) => acc + mins, 0) / ages.length);
    const overdueCount = ages.filter((mins) => mins >= 15).length;

    const severity: 'Healthy' | 'Watch' | 'Critical' =
      overdueCount >= 2 || oldestPendingMins >= 25
        ? 'Critical'
        : overdueCount >= 1 || oldestPendingMins >= 12
        ? 'Watch'
        : 'Healthy';

    return {
      pendingCount: pending.length,
      oldestPendingMins,
      avgPendingMins,
      overdueCount,
      severity
    };
  }, [state.thcDispatchHistory]);

  const thcClosureTrend = useMemo(() => {
    const recent = state.thcClosureAttempts.slice(0, 5);
    const recentBlocked = recent.filter((entry) => entry.status === 'Blocked').length;
    const recentClosed = recent.filter((entry) => entry.status === 'Closed').length;
    const total = recent.length;

    const conversionRatePercent =
      total > 0 ? Math.round((recentClosed / total) * 100) : 0;

    const trendSignal: 'Improving' | 'Flat' | 'Degrading' =
      total === 0
        ? 'Flat'
        : conversionRatePercent >= 60
        ? 'Improving'
        : conversionRatePercent >= 35
        ? 'Flat'
        : 'Degrading';

    return {
      recentWindow: total,
      recentBlocked,
      recentClosed,
      conversionRatePercent,
      lastOutcome: recent[0]?.status ?? 'None',
      trendSignal
    };
  }, [state.thcClosureAttempts]);

  const closeThcTurnover = () => {
    setState((prev) => {
      if (prev.thcSignOffStatus !== 'signed') {
        return {
          ...prev,
          thcBanner: 'Sign off checklist before closing turnover.',
          thcClosureAttempts: [
            {
              id: `THC-CLOSE-${Date.now()}`,
              at: new Date().toISOString(),
              status: 'Blocked' as const,
              reason: 'Checklist not signed off'
            },
            ...prev.thcClosureAttempts
          ].slice(0, 6)
        };
      }

      if (!prev.thcPackageRef) {
        return {
          ...prev,
          thcBanner: 'Generate THC package before closing turnover.',
          thcClosureAttempts: [
            {
              id: `THC-CLOSE-${Date.now()}`,
              at: new Date().toISOString(),
              status: 'Blocked' as const,
              reason: 'THC package missing'
            },
            ...prev.thcClosureAttempts
          ].slice(0, 6)
        };
      }

      const pending = prev.thcDispatchHistory.filter((entry) => !entry.acknowledged).length;
      if (pending > 0) {
        return {
          ...prev,
          thcBanner: `Cannot close turnover. ${pending} package receipt(s) still pending.`,
          thcClosureAttempts: [
            {
              id: `THC-CLOSE-${Date.now()}`,
              at: new Date().toISOString(),
              status: 'Blocked' as const,
              reason: `${pending} pending receipt(s)`
            },
            ...prev.thcClosureAttempts
          ].slice(0, 6)
        };
      }

      return {
        ...prev,
        thcTurnoverStatus: 'closed',
        thcClosedAt: new Date().toISOString(),
        thcBanner: 'THC turnover closed successfully.',
        thcClosureAttempts: [
          {
            id: `THC-CLOSE-${Date.now()}`,
            at: new Date().toISOString(),
            status: 'Closed' as const,
            reason: 'All closure criteria satisfied'
          },
          ...prev.thcClosureAttempts
        ].slice(0, 6)
      };
    });
  };

  const setThcReopenReasonDraft = (reason: string) => {
    setState((prev) => ({
      ...prev,
      thcReopenReasonDraft: reason,
      thcReopenBanner: null
    }));
  };

  const reopenThcTurnover = () => {
    setState((prev) => {
      if (prev.thcTurnoverStatus !== 'closed') {
        return {
          ...prev,
          thcReopenBanner: 'Turnover is already open.'
        };
      }

      if (prev.thcReopenReasonDraft.trim().length < 8) {
        return {
          ...prev,
          thcReopenBanner: 'Provide at least 8 characters to reopen turnover.'
        };
      }

      return {
        ...prev,
        thcTurnoverStatus: 'open',
        thcClosedAt: null,
        thcSignOffStatus: 'idle',
        thcSignedOffBy: null,
        thcSignedOffAt: null,
        thcReopenBanner: 'Turnover reopened and checklist unlocked.',
        thcReopenHistory: [
          {
            id: `THC-REOPEN-${Date.now()}`,
            reason: prev.thcReopenReasonDraft.trim(),
            at: new Date().toISOString()
          },
          ...prev.thcReopenHistory
        ].slice(0, 4),
        thcReopenReasonDraft: ''
      };
    });
  };

  return {
    ...state,
    fleetHealth,
    pendingIncidents,
    acknowledgeIncident,
    cycleBroadcastTarget,
    setBroadcastDraft,
    sendBroadcast,
    routeTrendSummary,
    cycleDispatchMode,
    cyclePeakHourPolicy,
    toggleAutoRecovery,
    generateDailyReportSnapshot,
    setHandoverNoteDraft,
    saveHandoverNote,
    cycleSlaWaitThreshold,
    cycleSlaOtpThreshold,
    slaBreaches,
    setAuditNoteDraft,
    saveAuditNote,
    thcCompletionPercent,
    toggleThcItem,
    resetThcChecklist,
    signOffThcChecklist,
    thcBlockers,
    toggleThcOverride,
    generateThcPackage,
    cycleThcDispatchRecipient,
    dispatchThcPackage,
    acknowledgeThcDispatch,
    sendThcDispatchReminder,
    thcPendingReceipts,
    escalateThcDispatch,
    closeThcTurnover,
    setThcReopenReasonDraft,
    reopenThcTurnover,
    thcInsights,
    thcReadiness,
    thcActionPlan,
    thcReceiptAging,
    thcClosureTrend
  };
}
