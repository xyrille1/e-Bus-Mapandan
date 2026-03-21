export type CachedSchedule = {
  routeName: string;
  stationName: string;
  upcomingBuses: string[];
  lastSyncAt: string;
  source: 'cache' | 'network';
};

const seedSnapshot: CachedSchedule = {
  routeName: 'Manaoag to Dagupan',
  stationName: 'Manaoag Public Terminal',
  upcomingBuses: ['Arriving in 6 mins', 'Arriving in 17 mins', 'Arriving in 29 mins'],
  lastSyncAt: '2026-03-20T07:10:00.000Z',
  source: 'cache'
};

export function getSeedSnapshot(): CachedSchedule {
  return seedSnapshot;
}

export async function fetchScheduleDelta(): Promise<CachedSchedule> {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  return {
    routeName: 'Manaoag to Dagupan',
    stationName: 'Manaoag Public Terminal',
    upcomingBuses: ['Arriving in 4 mins', 'Arriving in 15 mins', 'Arriving in 27 mins'],
    lastSyncAt: new Date().toISOString(),
    source: 'network'
  };
}
