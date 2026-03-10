export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export type ThemePalette = {
  black: string;
  white: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  background: string;
  surface: string;
  surfaceSoft: string;
  text: string;
  textMuted: string;
  textOnPrimary: string;
  border: string;
  divider: string;
  card: string;
  cardAlt: string;
  textOnCard: string;
  icon: string;
  iconOnCard: string;
  overlay: string;
  shadow: string;
};

export const lightPalette: ThemePalette = {
  black: '#000000',
  white: '#FFFFFF',
  primary: '#E53935',
  primaryDark: '#C62828',
  primarySoft: 'rgba(229,57,53,0.12)',
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceSoft: '#F9FAFB',
  text: '#111827',
  textMuted: '#6B7280',
  textOnPrimary: '#FFFFFF',
  border: '#E5E7EB',
  divider: 'rgba(17,24,39,0.08)',
  card: '#E53935',
  cardAlt: '#C62828',
  textOnCard: '#FFFFFF',
  icon: '#111827',
  iconOnCard: '#FFFFFF',
  overlay: 'rgba(17,24,39,0.28)',
  shadow: '#000000',
};

export const darkPalette: ThemePalette = {
  black: '#000000',
  white: '#FFFFFF',
  primary: '#FF5A52',
  primaryDark: '#E53935',
  primarySoft: 'rgba(255,90,82,0.18)',
  background: '#0F172A',
  surface: '#111827',
  surfaceSoft: '#1F2937',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  border: 'rgba(255,255,255,0.10)',
  divider: 'rgba(255,255,255,0.08)',
  card: '#FF5A52',
  cardAlt: '#E53935',
  textOnCard: '#FFFFFF',
  icon: '#F9FAFB',
  iconOnCard: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.45)',
  shadow: '#000000',
};

export function getPalette(theme: ResolvedTheme): ThemePalette {
  return theme === 'dark' ? darkPalette : lightPalette;
}
