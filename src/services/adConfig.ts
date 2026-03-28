import Constants from 'expo-constants';
import { Platform } from 'react-native';
import mobileAds, { MaxAdContentRating, TestIds } from 'react-native-google-mobile-ads';

type PlatformAdIds = {
  banner?: string;
  interstitial?: string;
  rewarded?: string;
};

type AdsConfig = {
  android?: PlatformAdIds;
  ios?: PlatformAdIds;
};

let initPromise: Promise<void> | null = null;

function getExtraAds(): AdsConfig {
  const extra = (Constants.expoConfig as any)?.extra ?? (Constants.manifest as any)?.extra ?? {};
  return (extra.ads ?? {}) as AdsConfig;
}

export function getAdUnitIds() {
  const ads = getExtraAds();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const ids = ads?.[platform] ?? {};

  return {
    banner: ids.banner || TestIds.BANNER,
    interstitial: ids.interstitial || TestIds.INTERSTITIAL,
    rewarded: ids.rewarded || TestIds.REWARDED,
  };
}

export async function ensureAdsInitialized(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!initPromise) {
    initPromise = (async () => {
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: ['EMULATOR'],
      });
      await mobileAds().initialize();
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}
