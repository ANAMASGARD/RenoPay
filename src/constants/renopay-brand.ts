/** Reno Pay neo-brutalist brand tokens (dark theme). */
export const RenoPayBrand = {
  background: '#0B100B',
  backgroundElevated: '#141A14',
  pitchLine: '#1E3D24',
  primary: '#F5D033',
  primaryPressed: '#E6C020',
  foreground: '#FFFFFF',
  muted: '#B8C4B8',
  border: '#000000',
  accentGreen: '#2D5A34',
  glass: 'rgba(20, 26, 20, 0.72)',
  cream: '#F5F0D8',
  creamPressed: '#E8E2C8',
  navGlass: 'rgba(90, 96, 90, 0.55)',
} as const;

export const NeoBrutalShadow = {
  sm: { shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  md: { shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6 },
  title: { shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
} as const;
