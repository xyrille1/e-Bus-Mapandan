export const alertRadiusOptions = [500, 1000, 2000] as const;

export type AlertRadiusMeters = (typeof alertRadiusOptions)[number];

export function formatRadius(radiusMeters: AlertRadiusMeters): string {
  if (radiusMeters >= 1000) {
    return `${radiusMeters / 1000} km`;
  }

  return `${radiusMeters} m`;
}

export function getDistanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number
): number {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(toLatitude - fromLatitude);
  const deltaLng = toRadians(toLongitude - fromLongitude);

  const fromLatRadians = toRadians(fromLatitude);
  const toLatRadians = toRadians(toLatitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLatRadians) * Math.cos(toLatRadians) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadiusMeters * c);
}
