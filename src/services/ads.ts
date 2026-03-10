import { Platform } from "react-native";
import Constants from "expo-constants";
import {
  AdEventType,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

/**
 * IDs de prueba (Google):
 * Android banner:       ca-app-pub-3940256099942544/6300978111
 * Android interstitial: ca-app-pub-3940256099942544/1033173712
 * Android rewarded:     ca-app-pub-3940256099942544/5224354917
 * iOS banner:           ca-app-pub-3940256099942544/2934735716
 * iOS interstitial:     ca-app-pub-3940256099942544/4411468910
 * iOS rewarded:         ca-app-pub-3940256099942544/1712485313
 */

function getExtraAds() {
  // Soporta: app.json -> expo.extra.ads
  const extra = (Constants.expoConfig as any)?.extra ?? (Constants.manifest as any)?.extra ?? {};
  return extra.ads ?? {};
}

export function getAdUnitIds() {
  const ads = getExtraAds();
  const platform = Platform.OS === "ios" ? "ios" : "android";
  const ids = ads?.[platform] ?? {};

  // Fallback a IDs de prueba si falta alguno en app.json
  return {
    banner: ids.banner || TestIds.BANNER,
    interstitial: ids.interstitial || TestIds.INTERSTITIAL,
    rewarded: ids.rewarded || TestIds.REWARDED,
  };
}

export async function showInterstitial(): Promise<boolean> {
  const { interstitial } = getAdUnitIds();

  return new Promise((resolve) => {
    const ad = InterstitialAd.createForAdRequest(interstitial, { requestNonPersonalizedAdsOnly: true });

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      try { ad.show(); } catch { resolve(false); }
    });

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      cleanup();
      resolve(true);
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      cleanup();
      resolve(false);
    });

    const cleanup = () => {
      try { unsubLoaded(); } catch {}
      try { unsubClosed(); } catch {}
      try { unsubError(); } catch {}
    };

    try {
      ad.load();
    } catch {
      cleanup();
      resolve(false);
    }
  });
}

/**
 * Retorna true si el usuario COMPLETÓ el anuncio y ganó la recompensa.
 * Si el anuncio falla o se cierra antes, retorna false.
 */
export async function showRewarded(): Promise<boolean> {
  const { rewarded } = getAdUnitIds();

  return new Promise((resolve) => {
    const ad = RewardedAd.createForAdRequest(rewarded, { requestNonPersonalizedAdsOnly: true });

    let rewardedEarned = false;

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      try { ad.show(); } catch { resolve(false); }
    });

    const unsubReward = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      rewardedEarned = true;
    });

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      cleanup();
      resolve(rewardedEarned);
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      cleanup();
      resolve(false);
    });

    const cleanup = () => {
      try { unsubLoaded(); } catch {}
      try { unsubReward(); } catch {}
      try { unsubClosed(); } catch {}
      try { unsubError(); } catch {}
    };

    try {
      ad.load();
    } catch {
      cleanup();
      resolve(false);
    }
  });
}
