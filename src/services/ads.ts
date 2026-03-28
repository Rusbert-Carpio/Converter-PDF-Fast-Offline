import {
  AdEventType,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { ensureAdsInitialized, getAdUnitIds } from './adConfig';

function createRequestOptions() {
  return { requestNonPersonalizedAdsOnly: true };
}

export async function showInterstitial(): Promise<boolean> {
  const { interstitial } = getAdUnitIds();

  try {
    await ensureAdsInitialized();
  } catch {
    return false;
  }

  return new Promise((resolve) => {
    const ad = InterstitialAd.createForAdRequest(interstitial, createRequestOptions());

    const cleanup = () => {
      try { unsubLoaded(); } catch {}
      try { unsubClosed(); } catch {}
      try { unsubError(); } catch {}
    };

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      try {
        ad.show();
      } catch {
        cleanup();
        resolve(false);
      }
    });

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      cleanup();
      resolve(true);
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      cleanup();
      resolve(false);
    });

    try {
      ad.load();
    } catch {
      cleanup();
      resolve(false);
    }
  });
}

export async function showRewarded(): Promise<boolean> {
  const { rewarded } = getAdUnitIds();

  try {
    await ensureAdsInitialized();
  } catch {
    return false;
  }

  return new Promise((resolve) => {
    const ad = RewardedAd.createForAdRequest(rewarded, createRequestOptions());
    let rewardEarned = false;

    const cleanup = () => {
      try { unsubLoaded(); } catch {}
      try { unsubReward(); } catch {}
      try { unsubClosed(); } catch {}
      try { unsubError(); } catch {}
    };

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      try {
        ad.show();
      } catch {
        cleanup();
        resolve(false);
      }
    });

    const unsubReward = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      rewardEarned = true;
    });

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      cleanup();
      resolve(rewardEarned);
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      cleanup();
      resolve(false);
    });

    try {
      ad.load();
    } catch {
      cleanup();
      resolve(false);
    }
  });
}
