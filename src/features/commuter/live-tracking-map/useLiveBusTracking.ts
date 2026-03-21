import { useEffect, useMemo, useState } from 'react';

import { fetchDeltaSince, formatBytes } from './deltaSync';
import { alertRadiusOptions, formatRadius, getDistanceMeters } from './proximityAlert';

import {
  BusStopEtaRow,
  BusSnapshot,
  filterStations,
  getBusStopEtaRows,
  getCachedStations,
  getDeadReckonedBus,
  getInitialBusSnapshot,
  getNextBusSnapshot,
  getRouteProgressPercent,
  getStationEtaRows,
  getStationSnapshot,
  routePolyline
} from './liveTrackingMock';

import type { EtaFallbackMode, StationEtaRow, StationSnapshot } from './liveTrackingMock';
import type { AlertRadiusMeters } from './proximityAlert';

type LiveTrackingState = {
  isLoading: boolean;
  errorMessage: string | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'failed';
  syncMessage: string | null;
  lastDeltaSyncAt: string | null;
  deltaUsageLabel: string | null;
  pendingDeltaSync: boolean;
  offlineMinutesBeforeReconnect: number;
  bus: BusSnapshot;
  lastLiveBus: BusSnapshot;
  routeName: string;
  searchQuery: string;
  cachedStations: StationSnapshot[];
  selectedStation: StationSnapshot;
  etaRows: StationEtaRow[];
  isBusDetailVisible: boolean;
  notificationsEnabled: boolean;
  notificationLeadMinutes: 5 | 10 | 15;
  notificationChannel: 'Push' | 'SMS' | 'Push+SMS';
  quietHoursEnabled: boolean;
  isFeedbackVisible: boolean;
  feedbackCategory: 'Crowding' | 'Delay' | 'Driver Conduct' | 'Suggestion';
  feedbackMessage: string;
  feedbackStatus: 'idle' | 'sending' | 'sent' | 'failed';
  feedbackBanner: string | null;
  authStatus: 'guest' | 'signed-in';
  profileName: string;
  savedRoutes: number;
  alertArmed: boolean;
  alertRadiusMeters: AlertRadiusMeters;
  alertStatus: 'idle' | 'armed' | 'triggered';
  alertMessage: string | null;
  fallbackMode: EtaFallbackMode;
  offlineMinutes: number;
};

const LIVE_TICK_MS = 5000;

export function useLiveBusTracking() {
  const [step, setStep] = useState<number>(0);
  const [state, setState] = useState<LiveTrackingState>({
    isLoading: true,
    errorMessage: null,
    syncStatus: 'idle',
    syncMessage: null,
    lastDeltaSyncAt: null,
    deltaUsageLabel: null,
    pendingDeltaSync: false,
    offlineMinutesBeforeReconnect: 0,
    bus: getInitialBusSnapshot(),
    lastLiveBus: getInitialBusSnapshot(),
    routeName: 'Manaoag to Dagupan',
    searchQuery: '',
    cachedStations: getCachedStations(),
    selectedStation: getStationSnapshot(),
    etaRows: getStationEtaRows(0, 'live', 0),
    isBusDetailVisible: false,
    notificationsEnabled: true,
    notificationLeadMinutes: 10,
    notificationChannel: 'Push',
    quietHoursEnabled: false,
    isFeedbackVisible: false,
    feedbackCategory: 'Delay',
    feedbackMessage: '',
    feedbackStatus: 'idle',
    feedbackBanner: null,
    authStatus: 'guest',
    profileName: 'Guest Rider',
    savedRoutes: 0,
    alertArmed: false,
    alertRadiusMeters: 500,
    alertStatus: 'idle',
    alertMessage: null,
    fallbackMode: 'live',
    offlineMinutes: 0
  });

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));

      if (!isMounted) {
        return;
      }

      setState((previousState: LiveTrackingState) => ({
        ...previousState,
        isLoading: false,
        errorMessage: null,
        syncStatus: 'idle',
        syncMessage: null,
        lastDeltaSyncAt: null,
        deltaUsageLabel: null,
        pendingDeltaSync: false,
        offlineMinutesBeforeReconnect: 0,
        bus: getInitialBusSnapshot(),
        lastLiveBus: getInitialBusSnapshot(),
        searchQuery: '',
        cachedStations: getCachedStations(),
        selectedStation: getStationSnapshot(),
        etaRows: getStationEtaRows(0, 'live', 0),
        isBusDetailVisible: false,
        notificationsEnabled: true,
        notificationLeadMinutes: 10,
        notificationChannel: 'Push',
        quietHoursEnabled: false,
        isFeedbackVisible: false,
        feedbackCategory: 'Delay',
        feedbackMessage: '',
        feedbackStatus: 'idle',
        feedbackBanner: null,
        authStatus: 'guest',
        profileName: 'Guest Rider',
        savedRoutes: 0,
        alertArmed: false,
        alertRadiusMeters: 500,
        alertStatus: 'idle',
        alertMessage: null,
        fallbackMode: 'live',
        offlineMinutes: 0
      }));
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (state.isLoading) {
      return;
    }

    const timer = setInterval(() => {
      setStep((previousStep) => previousStep + 1);
    }, LIVE_TICK_MS);

    return () => {
      clearInterval(timer);
    };
  }, [state.isLoading]);

  useEffect(() => {
    if (state.isLoading) {
      return;
    }

    const nextBus = getNextBusSnapshot(step);

    setState((previousState: LiveTrackingState) => {
      if (nextBus.status !== 'Offline') {
        const cameFromOffline = previousState.fallbackMode !== 'live';

        return {
          ...previousState,
          errorMessage: null,
          syncStatus: cameFromOffline ? 'syncing' : previousState.syncStatus,
          syncMessage: cameFromOffline ? 'Syncing route changes...' : previousState.syncMessage,
          pendingDeltaSync: cameFromOffline,
          offlineMinutesBeforeReconnect: cameFromOffline ? previousState.offlineMinutes : 0,
          bus: nextBus,
          lastLiveBus: nextBus,
          etaRows: getStationEtaRows(step, 'live', 0),
          fallbackMode: 'live',
          offlineMinutes: 0
        };
      }

      const offlineMinutes = previousState.offlineMinutes + 1;
      const fallbackMode: EtaFallbackMode =
        offlineMinutes >= 5 ? 'schedule' : 'dead-reckoning';

      const fallbackBus: BusSnapshot =
        fallbackMode === 'dead-reckoning'
          ? getDeadReckonedBus(previousState.lastLiveBus, offlineMinutes)
          : {
              ...previousState.lastLiveBus,
              status: 'Offline' as const,
              speedKph: 0,
              updatedAt: new Date().toISOString()
            };

      return {
        ...previousState,
        errorMessage: 'Estimated - Live data unavailable',
        bus: fallbackBus,
        etaRows: getStationEtaRows(step, fallbackMode, offlineMinutes),
        fallbackMode,
        offlineMinutes
      };
    });
  }, [state.isLoading, step]);

  useEffect(() => {
    if (!state.pendingDeltaSync) {
      return;
    }

    let isMounted = true;

    const syncDelta = async () => {
      try {
        const previousCursor = state.lastDeltaSyncAt ?? state.lastLiveBus.updatedAt;
        const deltaResult = await fetchDeltaSince(
          previousCursor,
          state.offlineMinutesBeforeReconnect
        );

        if (!isMounted) {
          return;
        }

        const changeCount = deltaResult.changedEtaRows + deltaResult.changedStations;

        setState((previousState: LiveTrackingState) => ({
          ...previousState,
          pendingDeltaSync: false,
          syncStatus: 'synced',
          syncMessage: `${changeCount} updates applied`,
          lastDeltaSyncAt: deltaResult.newCursor,
          deltaUsageLabel: formatBytes(deltaResult.downloadBytes)
        }));
      } catch (_error) {
        if (!isMounted) {
          return;
        }

        setState((previousState: LiveTrackingState) => ({
          ...previousState,
          pendingDeltaSync: false,
          syncStatus: 'failed',
          syncMessage: 'Delta sync failed. Using cached data.'
        }));
      }
    };

    syncDelta();

    return () => {
      isMounted = false;
    };
  }, [state.lastDeltaSyncAt, state.lastLiveBus.updatedAt, state.offlineMinutesBeforeReconnect, state.pendingDeltaSync]);

  const statusTone = useMemo(() => {
    if (state.bus.status === 'Offline') {
      return 'offline' as const;
    }

    if (state.bus.status === 'Delayed') {
      return 'syncing' as const;
    }

    return 'online' as const;
  }, [state.bus.status]);

  const initialRegion = useMemo(
    () => ({
      latitude: routePolyline[0].latitude,
      longitude: routePolyline[0].longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08
    }),
    []
  );

  const filteredStations = useMemo(
    () => filterStations(state.cachedStations, state.searchQuery),
    [state.cachedStations, state.searchQuery]
  );

  const routeProgressPercent = useMemo(() => getRouteProgressPercent(step), [step]);

  const busStopEtaRows = useMemo<BusStopEtaRow[]>(
    () => getBusStopEtaRows(step, state.fallbackMode, state.offlineMinutes),
    [step, state.fallbackMode, state.offlineMinutes]
  );

  const distanceToSelectedStationMeters = useMemo(
    () =>
      getDistanceMeters(
        state.bus.latitude,
        state.bus.longitude,
        state.selectedStation.latitude,
        state.selectedStation.longitude
      ),
    [
      state.bus.latitude,
      state.bus.longitude,
      state.selectedStation.latitude,
      state.selectedStation.longitude
    ]
  );

  const setSearchQuery = (query: string) => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      searchQuery: query
    }));
  };

  const selectStation = (stationId: string) => {
    setState((previousState: LiveTrackingState) => {
      const selected = previousState.cachedStations.find((station) => station.id === stationId);
      if (!selected) {
        return previousState;
      }

      return {
        ...previousState,
        selectedStation: selected,
        searchQuery: selected.name
      };
    });
  };

  const cycleWakeAlert = () => {
    setState((previousState: LiveTrackingState) => {
      if (!previousState.alertArmed) {
        return {
          ...previousState,
          alertArmed: true,
          alertRadiusMeters: 500,
          alertStatus: 'armed',
          alertMessage: `Wake alert armed at ${formatRadius(500)}`
        };
      }

      const currentIndex = alertRadiusOptions.findIndex(
        (radius) => radius === previousState.alertRadiusMeters
      );
      const isLast = currentIndex === alertRadiusOptions.length - 1;

      if (isLast) {
        return {
          ...previousState,
          alertArmed: false,
          alertStatus: 'idle',
          alertMessage: 'Wake alert turned off'
        };
      }

      const nextRadius = alertRadiusOptions[currentIndex + 1];

      return {
        ...previousState,
        alertArmed: true,
        alertRadiusMeters: nextRadius,
        alertStatus: 'armed',
        alertMessage: `Wake alert armed at ${formatRadius(nextRadius)}`
      };
    });
  };

  const dismissWakeAlert = () => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      alertStatus: previousState.alertArmed ? 'armed' : 'idle',
      alertMessage: previousState.alertArmed
        ? `Wake alert armed at ${formatRadius(previousState.alertRadiusMeters)}`
        : null
    }));
  };

  const toggleBusDetail = () => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      isBusDetailVisible: !previousState.isBusDetailVisible
    }));
  };

  const toggleNotificationsEnabled = () => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      notificationsEnabled: !previousState.notificationsEnabled
    }));
  };

  const cycleNotificationLeadMinutes = () => {
    setState((previousState: LiveTrackingState) => {
      const leadOptions: Array<5 | 10 | 15> = [5, 10, 15];
      const currentIndex = leadOptions.findIndex(
        (option) => option === previousState.notificationLeadMinutes
      );
      const nextIndex = (currentIndex + 1) % leadOptions.length;

      return {
        ...previousState,
        notificationLeadMinutes: leadOptions[nextIndex]
      };
    });
  };

  const cycleNotificationChannel = () => {
    setState((previousState: LiveTrackingState) => {
      const channelOptions: Array<'Push' | 'SMS' | 'Push+SMS'> = ['Push', 'SMS', 'Push+SMS'];
      const currentIndex = channelOptions.findIndex(
        (option) => option === previousState.notificationChannel
      );
      const nextIndex = (currentIndex + 1) % channelOptions.length;

      return {
        ...previousState,
        notificationChannel: channelOptions[nextIndex]
      };
    });
  };

  const toggleQuietHours = () => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      quietHoursEnabled: !previousState.quietHoursEnabled
    }));
  };

  const toggleFeedbackSheet = () => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      isFeedbackVisible: !previousState.isFeedbackVisible,
      feedbackStatus: previousState.isFeedbackVisible ? previousState.feedbackStatus : 'idle',
      feedbackBanner: previousState.isFeedbackVisible ? previousState.feedbackBanner : null
    }));
  };

  const cycleFeedbackCategory = () => {
    setState((previousState: LiveTrackingState) => {
      const categories: Array<'Crowding' | 'Delay' | 'Driver Conduct' | 'Suggestion'> = [
        'Crowding',
        'Delay',
        'Driver Conduct',
        'Suggestion'
      ];
      const currentIndex = categories.findIndex(
        (category) => category === previousState.feedbackCategory
      );
      const nextIndex = (currentIndex + 1) % categories.length;

      return {
        ...previousState,
        feedbackCategory: categories[nextIndex]
      };
    });
  };

  const setFeedbackMessage = (message: string) => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      feedbackMessage: message,
      feedbackStatus: previousState.feedbackStatus === 'failed' ? 'idle' : previousState.feedbackStatus,
      feedbackBanner: previousState.feedbackStatus === 'failed' ? null : previousState.feedbackBanner
    }));
  };

  const submitFeedback = async () => {
    if (state.feedbackMessage.trim().length < 6) {
      setState((previousState: LiveTrackingState) => ({
        ...previousState,
        feedbackStatus: 'failed',
        feedbackBanner: 'Please enter at least 6 characters before submitting.'
      }));
      return;
    }

    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      feedbackStatus: 'sending',
      feedbackBanner: 'Sending feedback...'
    }));

    await new Promise((resolve) => setTimeout(resolve, 650));

    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      feedbackStatus: 'sent',
      feedbackMessage: '',
      feedbackBanner: `${previousState.feedbackCategory} report submitted at ${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })}`
    }));
  };

  const signInCommuter = () => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      authStatus: 'signed-in',
      profileName: 'Paul J.',
      savedRoutes: 3
    }));
  };

  const useGuestMode = () => {
    setState((previousState: LiveTrackingState) => ({
      ...previousState,
      authStatus: 'guest',
      profileName: 'Guest Rider',
      savedRoutes: 0
    }));
  };

  useEffect(() => {
    if (!state.alertArmed || state.alertStatus === 'triggered') {
      return;
    }

    if (distanceToSelectedStationMeters <= state.alertRadiusMeters) {
      setState((previousState: LiveTrackingState) => ({
        ...previousState,
        alertArmed: false,
        alertStatus: 'triggered',
        alertMessage: previousState.notificationsEnabled
          ? `${previousState.bus.id} is now within ${formatRadius(previousState.alertRadiusMeters)} of ${previousState.selectedStation.name}. Sent via ${previousState.notificationChannel}.`
          : `${previousState.bus.id} reached ${previousState.selectedStation.name}, but notifications are muted.`
      }));
    }
  }, [
    distanceToSelectedStationMeters,
    state.alertArmed,
    state.alertRadiusMeters,
    state.alertStatus,
    state.notificationsEnabled,
    state.notificationChannel
  ]);

  return {
    ...state,
    statusTone,
    routePolyline,
    initialRegion,
    filteredStations,
    routeProgressPercent,
    busStopEtaRows,
    distanceToSelectedStationMeters,
    notificationModeLabel: state.notificationsEnabled ? 'On' : 'Muted',
    setSearchQuery,
    selectStation,
    toggleBusDetail,
    toggleNotificationsEnabled,
    cycleNotificationLeadMinutes,
    cycleNotificationChannel,
    toggleQuietHours,
    toggleFeedbackSheet,
    cycleFeedbackCategory,
    setFeedbackMessage,
    submitFeedback,
    signInCommuter,
    useGuestMode,
    cycleWakeAlert,
    dismissWakeAlert,
    alertRadiusLabel: formatRadius(state.alertRadiusMeters),
    notificationLeadMinutes: state.notificationLeadMinutes,
    notificationChannel: state.notificationChannel,
    quietHoursEnabled: state.quietHoursEnabled,
    isFeedbackVisible: state.isFeedbackVisible,
    feedbackCategory: state.feedbackCategory,
    feedbackMessage: state.feedbackMessage,
    feedbackStatus: state.feedbackStatus,
    feedbackBanner: state.feedbackBanner,
    authStatus: state.authStatus,
    profileName: state.profileName,
    savedRoutes: state.savedRoutes
  };
}
