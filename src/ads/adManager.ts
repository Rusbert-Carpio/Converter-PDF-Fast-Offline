import AsyncStorage from "@react-native-async-storage/async-storage";
import { InterstitialAd, RewardedAd, AdEventType, RewardedAdEventType } from "react-native-google-mobile-ads";
import { TestAdUnitIds } from "./googleAds";

/**
 * Monetización: interstitial + rewarded.
 * - Interstitial: cada 3-4 conversiones exitosas (no en la primera).
 * - Rewarded: desbloqueos diarios para features premium (si no eres premium).
 */

const KEY = {
  convCount: "ameda_conv_count_v1",
  nextInterstitialAt: "ameda_next_interstitial_at_v1",
  daily: "ameda_daily_unlocks_v1", // JSON por fecha
};

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type DailyState = {
  date: string;
  maxQualityUsed: number; // max 2
  mergeUsed: number; // max 2
  totalUsed: number; // max 5
};

async function getDaily(): Promise<DailyState> {
  const raw = await AsyncStorage.getItem(KEY.daily);
  const t = todayKey();
  if (!raw) return { date: t, maxQualityUsed: 0, mergeUsed: 0, totalUsed: 0 };
  try {
    const parsed = JSON.parse(raw) as DailyState;
    if (parsed.date !== t) return { date: t, maxQualityUsed: 0, mergeUsed: 0, totalUsed: 0 };
    return parsed;
  } catch {
    return { date: t, maxQualityUsed: 0, mergeUsed: 0, totalUsed: 0 };
  }
}

async function setDaily(s: DailyState) {
  await AsyncStorage.setItem(KEY.daily, JSON.stringify(s));
}

function rand34() {
  return Math.random() < 0.5 ? 3 : 4;
}

let interstitial: InterstitialAd | null = null;
let rewarded: RewardedAd | null = null;

export function prepareInterstitial() {
  if (interstitial) return;
  interstitial = InterstitialAd.createForAdRequest(TestAdUnitIds.interstitial, {
    requestNonPersonalizedAdsOnly: true,
  });
  interstitial.load();
}

export async function maybeShowInterstitialAfterConversion(): Promise<void> {
  try {
    prepareInterstitial();

    const rawCount = await AsyncStorage.getItem(KEY.convCount);
    const count = rawCount ? parseInt(rawCount, 10) || 0 : 0;

    const rawNext = await AsyncStorage.getItem(KEY.nextInterstitialAt);
    let nextAt = rawNext ? parseInt(rawNext, 10) || 0 : 0;

    const newCount = count + 1;
    await AsyncStorage.setItem(KEY.convCount, String(newCount));

    // Nunca en la primera conversión
    if (newCount < 2) {
      if (!nextAt) {
        nextAt = rand34();
        await AsyncStorage.setItem(KEY.nextInterstitialAt, String(nextAt));
      }
      return;
    }

    if (!nextAt) {
      nextAt = rand34();
      await AsyncStorage.setItem(KEY.nextInterstitialAt, String(nextAt));
    }

    if (newCount < nextAt) return;

    // Intentar mostrar si está cargado
    if (!interstitial) return;

    await new Promise<void>((resolve) => {
      const sub = interstitial!.addAdEventListener(AdEventType.CLOSED, () => {
        sub();
        // Prepara el siguiente
        interstitial = null;
        prepareInterstitial();
        resolve();
      });

      const fail = interstitial!.addAdEventListener(AdEventType.ERROR, () => {
        fail();
        interstitial = null;
        prepareInterstitial();
        resolve();
      });

      if (interstitial!.loaded) {
        interstitial!.show();
      } else {
        // Si aún no cargó, no bloqueamos UX.
        resolve();
      }
    });

    const next = newCount + rand34();
    await AsyncStorage.setItem(KEY.nextInterstitialAt, String(next));
  } catch (e) {
    console.log("maybeShowInterstitialAfterConversion error", e);
  }
}

export type RewardFeature = "max_quality" | "merge_pdf";

export async function canUseRewarded(feature: RewardFeature) {
  const d = await getDaily();
  if (d.totalUsed >= 5) return { ok: false as const, reason: "global_limit" as const, state: d };
  if (feature === "max_quality" && d.maxQualityUsed >= 2) return { ok: false as const, reason: "feature_limit" as const, state: d };
  if (feature === "merge_pdf" && d.mergeUsed >= 2) return { ok: false as const, reason: "feature_limit" as const, state: d };
  return { ok: true as const, state: d };
}

export async function watchRewardedAndGrant(feature: RewardFeature): Promise<boolean> {
  // Carga y muestra un rewarded. Devuelve true si el usuario completó la recompensa.
  try {
    const allowed = await canUseRewarded(feature);
    if (!allowed.ok) return false;

    rewarded = RewardedAd.createForAdRequest(TestAdUnitIds.rewarded, { requestNonPersonalizedAdsOnly: true });
    rewarded.load();

    const granted = await new Promise<boolean>((resolve) => {
      let done = false;

      const cleanup = () => {
        if (done) return;
        done = true;
        resolve(false);
      };

      const unsubReward = rewarded!.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
        try {
          const d = await getDaily();
          const next: DailyState = { ...d, totalUsed: d.totalUsed + 1 };
          if (feature === "max_quality") next.maxQualityUsed += 1;
          if (feature === "merge_pdf") next.mergeUsed += 1;
          await setDaily(next);
          resolve(true);
        } catch {
          resolve(true);
        }
      });

      const unsubClose = rewarded!.addAdEventListener(AdEventType.CLOSED, () => {
        unsubReward();
        unsubClose();
        if (!done) cleanup();
      });

      const unsubErr = rewarded!.addAdEventListener(AdEventType.ERROR, () => {
        unsubReward();
        unsubClose();
        unsubErr();
        cleanup();
      });

      // Esperar un poco a que cargue
      const t = setTimeout(() => {
        if (rewarded?.loaded) rewarded.show();
        else cleanup();
        clearTimeout(t);
      }, 800);
    });

    return granted;
  } catch (e) {
    console.log("watchRewardedAndGrant error", e);
    return false;
  }
}
