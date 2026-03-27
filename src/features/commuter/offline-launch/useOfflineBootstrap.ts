import * as Network from 'expo-network';
import { useEffect, useMemo, useState } from 'react';

import {
  CachedSchedule,
  fetchScheduleDelta,
  getSeedSnapshot,
  readCachedSchedule,
  writeCachedSchedule
} from '../../../shared/storage/scheduleCache';

type OfflineBootstrapState = {
  schedule: CachedSchedule;
  /** true while the SQLite read is in flight (≈10–30 ms) */
  isLoadingCache: boolean;
  /** true while the background network sync is in progress */
  isSyncing: boolean;
  /** null = not yet determined; true/false = known connectivity */
  isOnline: boolean | null;
  errorMessage: string | null;
};

export function useOfflineBootstrap() {
  const [state, setState] = useState<OfflineBootstrapState>({
    // Render immediately with the in-memory seed — zero wait, no blank screen.
    schedule: getSeedSnapshot(),
    isLoadingCache: true,
    isSyncing: false,
    isOnline: null,
    errorMessage: null
  });

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      // ── Phase 1: Read from SQLite (fast, ~10–30 ms) ─────────────────────
      const cached = await readCachedSchedule();
      if (!isMounted) return;

      setState((prev) => ({
        ...prev,
        schedule: cached,
        isLoadingCache: false,
        isSyncing: true
      }));

      // ── Phase 2: Check real network connectivity ─────────────────────────
      let isOnline = false;
      try {
        const net = await Network.getNetworkStateAsync();
        isOnline = Boolean(net.isConnected && net.isInternetReachable);
      } catch {
        isOnline = false;
      }

      if (!isMounted) return;

      if (!isOnline) {
        setState((prev) => ({ ...prev, isSyncing: false, isOnline: false }));
        return;
      }

      setState((prev) => ({ ...prev, isOnline: true }));

      // ── Phase 3: Background network sync ────────────────────────────────
      try {
        const updated = await fetchScheduleDelta();
        if (!isMounted) return;

        await writeCachedSchedule(updated);
        if (!isMounted) return;

        setState((prev) => ({
          ...prev,
          schedule: updated,
          isSyncing: false,
          errorMessage: null
        }));
      } catch {
        if (!isMounted) return;
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          errorMessage: 'Live sync unavailable. Showing last known schedule.'
        }));
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const statusTone = useMemo(() => {
    if (state.isLoadingCache || state.isOnline === null) return 'syncing' as const;
    if (state.isOnline === false || state.errorMessage) return 'offline' as const;
    if (state.isSyncing) return 'syncing' as const;
    return 'online' as const;
  }, [state.isLoadingCache, state.isOnline, state.isSyncing, state.errorMessage]);

  return {
    schedule: state.schedule,
    isLoadingCache: state.isLoadingCache,
    isSyncing: state.isSyncing,
    isOnline: state.isOnline,
    errorMessage: state.errorMessage,
    statusTone
  };
}
