import { useEffect, useMemo, useState } from 'react';

import {
  CachedSchedule,
  fetchScheduleDelta,
  getSeedSnapshot
} from '../../../shared/storage/scheduleCache';

type OfflineBootstrapState = {
  schedule: CachedSchedule;
  isSyncing: boolean;
  errorMessage: string | null;
};

export function useOfflineBootstrap() {
  const [state, setState] = useState<OfflineBootstrapState>({
    schedule: getSeedSnapshot(),
    isSyncing: true,
    errorMessage: null
  });

  useEffect(() => {
    let isMounted = true;

    const sync = async () => {
      try {
        const updatedSnapshot = await fetchScheduleDelta();

        if (!isMounted) {
          return;
        }

        setState({
          schedule: updatedSnapshot,
          isSyncing: false,
          errorMessage: null
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setState((previousState: OfflineBootstrapState) => ({
          schedule: previousState.schedule,
          isSyncing: false,
          errorMessage: 'Live sync unavailable. Showing last known schedule.'
        }));
      }
    };

    sync();

    return () => {
      isMounted = false;
    };
  }, []);

  const statusTone = useMemo(() => {
    if (state.isSyncing) {
      return 'syncing' as const;
    }

    if (state.errorMessage) {
      return 'offline' as const;
    }

    return 'online' as const;
  }, [state.errorMessage, state.isSyncing]);

  return {
    ...state,
    statusTone
  };
}
