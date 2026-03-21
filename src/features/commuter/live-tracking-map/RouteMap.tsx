import { Platform } from 'react-native';
import type { ReactElement } from 'react';

import type { RouteMapProps } from './RouteMap.types';

const RouteMapImpl: (props: RouteMapProps) => ReactElement =
  Platform.OS === 'web'
    ? require('./RouteMap.web').RouteMap
    : require('./RouteMap.native').RouteMap;

export function RouteMap(props: RouteMapProps) {
  return <RouteMapImpl {...props} />;
}
