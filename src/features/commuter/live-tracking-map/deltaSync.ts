export type DeltaSyncResult = {
  changedEtaRows: number;
  changedStations: number;
  downloadBytes: number;
  newCursor: string;
};

export async function fetchDeltaSince(
  previousCursor: string,
  offlineMinutes: number
): Promise<DeltaSyncResult> {
  await new Promise((resolve) => setTimeout(resolve, 850));

  const changedEtaRows = 2 + Math.min(offlineMinutes, 5);
  const changedStations = offlineMinutes >= 4 ? 1 : 0;
  const downloadBytes = 860 + changedEtaRows * 210 + changedStations * 320;

  return {
    changedEtaRows,
    changedStations,
    downloadBytes,
    newCursor: new Date().toISOString()
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}
