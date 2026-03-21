import { render, screen } from '@testing-library/react-native';
import React from 'react';

import App from '../App';

jest.mock('../src/features/commuter/live-tracking-map/RouteMap', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    RouteMap: () => React.createElement(View, { testID: 'route-map-mock' })
  };
});

describe('App', () => {
  it('renders mode switch labels on native layout', () => {
    render(<App />);

    expect(screen.getByText('COMMUTER')).toBeTruthy();
    expect(screen.getByText('DRIVER')).toBeTruthy();
    expect(screen.getByTestId('route-map-mock')).toBeTruthy();
  });
});
