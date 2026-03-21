export const colors = {
  // Core backgrounds
  bg: '#f5f2ed',
  bg2: '#ede9e2',
  surface: '#ffffff',
  surface2: '#f9f7f4',

  // Borders
  border: 'rgba(0,0,0,0.07)',
  borderMd: 'rgba(0,0,0,0.11)',

  // Ink
  ink: '#1a1714',
  ink2: '#4a4540',
  ink3: '#9c958c',
  ink4: '#c4bdb5',

  // Accent
  amber: '#e8960c',
  amberBg: '#fff7e6',
  amberBorder: 'rgba(232,150,12,0.25)',

  // Success
  green: '#1a8a4a',
  greenBg: '#edfaf3',
  greenBorder: 'rgba(26,138,74,0.2)',

  // Info
  blue: '#1d6fb8',
  blueBg: '#eef5fd',
  blueBorder: 'rgba(29,111,184,0.2)',
  blueLine: '#3b82f6',

  // Danger
  red: '#c93535',
  redBg: '#fef0f0',
  redBorder: 'rgba(201,53,53,0.2)',

  // Backward-compatible aliases
  bgCanvas: '#f5f2ed',
  bgCard: '#ffffff',
  textPrimary: '#1a1714',
  textMuted: '#4a4540',
  accent: '#1a8a4a',
  accentSoft: '#edfaf3',
  warning: '#e8960c',
  warningSoft: '#fff7e6',
  danger: '#c93535',
  dangerSoft: '#fef0f0'
} as const;

export const typography = {
  fontDisplay: 'Fraunces',
  fontBody: 'PlusJakartaSans',
  scale: [11, 13, 14, 17, 20, 28, 36] as const
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  s10: 10,
  sm: 12,
  s14: 14,
  md: 16,
  s18: 18,
  s22: 22,
  lg: 24,
  xl: 32,
  xxl: 48,
  s64: 64
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 32,
  full: 999
} as const;

export const shadow = {
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  lg: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8
  }
} as const;
