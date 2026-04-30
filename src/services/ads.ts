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

let interstitialAd: InterstitialAd | null = null;
let interstitialLoaded = false;
let interstitialLoading = false;
let interstitialLoadPromise: Promise<boolean> | null = null;

let rewardedAd: RewardedAd | null = null;
let rewardedLoaded = false;
let rewardedLoading = false;
let rewardedLoadPromise: Promise<boolean> | null = null;

function resetInterstitialState() {
  interstitialAd = null;
  interstitialLoaded = false;
  interstitialLoading = false;
  interstitialLoadPromise = null;
}

function resetRewardedState() {
  rewardedAd = null;
  rewardedLoaded = false;
  rewardedLoading = false;
  rewardedLoadPromise = null;
}

export function isInterstitialReady() {
  return interstitialLoaded && !!interstitialAd;
}

export function isRewardedReady() {
  return rewardedLoaded && !!rewardedAd;
}

export async function preloadInterstitial(): Promise<boolean> {
  if (isInterstitialReady()) return true;
  if (interstitialLoadPromise) return interstitialLoadPromise;

  interstitialLoadPromise = (async () => {
    const { interstitial } = getAdUnitIds();

    try {
      await ensureAdsInitialized();
    } catch {
      resetInterstitialState();
      return false;
    }

    return new Promise<boolean>((resolve) => {
      interstitialLoading = true;
      const ad = InterstitialAd.createForAdRequest(interstitial, createRequestOptions());
      interstitialAd = ad;

      const cleanup = () => {
        try { unsubLoaded(); } catch {}
        try { unsubError(); } catch {}
      };

      const finish = (ok: boolean) => {
        cleanup();
        interstitialLoading = false;
        interstitialLoadPromise = null;
        if (!ok) {
          interstitialAd = null;
          interstitialLoaded = false;
        }
        resolve(ok);
      };

      const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        interstitialLoaded = true;
        finish(true);
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        finish(false);
      });

      try {
        ad.load();
      } catch {
        finish(false);
      }
    });
  })();

  return interstitialLoadPromise;
}

export async function preloadRewarded(): Promise<boolean> {
  if (isRewardedReady()) return true;
  if (rewardedLoadPromise) return rewardedLoadPromise;

  rewardedLoadPromise = (async () => {
    const { rewarded } = getAdUnitIds();

    try {
      await ensureAdsInitialized();
    } catch {
      resetRewardedState();
      return false;
    }

    return new Promise<boolean>((resolve) => {
      rewardedLoading = true;
      const ad = RewardedAd.createForAdRequest(rewarded, createRequestOptions());
      rewardedAd = ad;

      const cleanup = () => {
        try { unsubLoaded(); } catch {}
        try { unsubError(); } catch {}
      };

      const finish = (ok: boolean) => {
        cleanup();
        rewardedLoading = false;
        rewardedLoadPromise = null;
        if (!ok) {
          rewardedAd = null;
          rewardedLoaded = false;
        }
        resolve(ok);
      };

      const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        rewardedLoaded = true;
        finish(true);
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        finish(false);
      });

      try {
        ad.load();
      } catch {
        finish(false);
      }
    });
  })();

  return rewardedLoadPromise;
}

export async function warmUpAds(): Promise<void> {
  try {
    await ensureAdsInitialized();
  } catch {
    return;
  }

  void preloadInterstitial();
  void preloadRewarded();
}

export async function showInterstitial(): Promise<boolean> {
  try {
    await ensureAdsInitialized();
  } catch {
    return false;
  }

  if (!isInterstitialReady()) {
    const loaded = await preloadInterstitial();
    if (!loaded || !interstitialAd) return false;
  }

  const ad = interstitialAd;
  if (!ad) return false;

  interstitialAd = null;
  interstitialLoaded = false;

  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      try { unsubClosed(); } catch {}
      try { unsubError(); } catch {}
    };

    const finish = (ok: boolean) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      void preloadInterstitial();
      resolve(ok);
    };

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => finish(true));
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => finish(false));

    try {
      ad.show();
    } catch {
      finish(false);
    }
  });
}

export async function showRewarded(): Promise<boolean> {
  try {
    await ensureAdsInitialized();
  } catch {
    return false;
  }

  if (!isRewardedReady()) {
    const loaded = await preloadRewarded();
    if (!loaded || !rewardedAd) return false;
  }

  const ad = rewardedAd;
  if (!ad) return false;

  rewardedAd = null;
  rewardedLoaded = false;

  return new Promise((resolve) => {
    let rewardEarned = false;
    let resolved = false;

    const cleanup = () => {
      try { unsubReward(); } catch {}
      try { unsubClosed(); } catch {}
      try { unsubError(); } catch {}
    };

    const finish = (ok: boolean) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      void preloadRewarded();
      resolve(ok);
    };

    const unsubReward = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      rewardEarned = true;
    });

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => finish(rewardEarned));
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => finish(false));

    try {
      ad.show();
    } catch {
      finish(false);
    }
  });
}
