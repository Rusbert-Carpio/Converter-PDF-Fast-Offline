import { Platform } from 'react-native';

export const AD_BANNER_FALLBACK_HEIGHT = 60;

const HIDDEN_BANNER_ROUTES = new Set([
  '/language-setup',
  '/premium',
  '/plans',
  '/pdf-viewer',
  '/privacy-policy',
]);

export function shouldShowBannerForRoute(pathname: string) {
  return !HIDDEN_BANNER_ROUTES.has(pathname);
}

export function getAdaptiveBannerSize() {
  return Platform.OS === 'web' ? undefined : 'ANCHORED_ADAPTIVE_BANNER';
}
