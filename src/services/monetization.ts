import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './storageKeys';

export type RewardFeature = 'max_quality' | 'merge_pdf' | 'img_to_pdf_unlock' | 'pdf_to_image_unlock';

type CounterKey =
  | 'imgToPdfFreeUsed'
  | 'imgToPdfRewardedUsed'
  | 'pdfToImgFreeUsed'
  | 'pdfToImgRewardedUsed'
  | 'mergeRewardedUsed'
  | 'maxQualityUsed';

export type MonetizationState = {
  dateKey: string;
  imgToPdfFreeUsed: number;
  imgToPdfRewardedUsed: number;
  pdfToImgFreeUsed: number;
  pdfToImgRewardedUsed: number;
  mergeRewardedUsed: number;
  rewardedGlobalUsed: number;
  maxQualityUsed: number;
  pdfViewsTotal: number;
  imgToPdfSuccessTotal: number;
};

const FEATURE_LIMITS: Record<RewardFeature, { perDay: number | null; counter?: CounterKey }> = {
  max_quality: { perDay: 2, counter: 'maxQualityUsed' },
  merge_pdf: { perDay: 2, counter: 'mergeRewardedUsed' },
  img_to_pdf_unlock: { perDay: null },
  pdf_to_image_unlock: { perDay: null },
};

export const Limits = {
  imgToPdfFreePerDay: 2,
  imgToPdfPaywallAfterRewarded: 2,
  pdfToImgFreePerDay: 3,
  pdfToImgPaywallAfterRewarded: 2,
  pdfToImageMaxPagesPerConversionFree: 5,
  mergePaywallAfterRewarded: 2,
  interstitialEveryPdfViews: 2,
  imgToPdfInterstitialEverySuccesses: 4,
  rewardedGlobalCapPerDay: 5,
} as const;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DEFAULT_STATE: MonetizationState = {
  dateKey: todayKey(),
  imgToPdfFreeUsed: 0,
  imgToPdfRewardedUsed: 0,
  pdfToImgFreeUsed: 0,
  pdfToImgRewardedUsed: 0,
  mergeRewardedUsed: 0,
  rewardedGlobalUsed: 0,
  maxQualityUsed: 0,
  pdfViewsTotal: 0,
  imgToPdfSuccessTotal: 0,
};

function normalizeState(input: Partial<MonetizationState> | null | undefined): MonetizationState {
  if (!input?.dateKey || input.dateKey !== todayKey()) return { ...DEFAULT_STATE };
  return {
    ...DEFAULT_STATE,
    ...input,
    dateKey: input.dateKey,
  };
}

async function readStorageKey(key: string): Promise<MonetizationState | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return normalizeState(JSON.parse(raw) as Partial<MonetizationState>);
  } catch {
    return null;
  }
}

async function saveState(state: MonetizationState) {
  await AsyncStorage.setItem(STORAGE_KEYS.monetization, JSON.stringify(state));
}

async function loadState(): Promise<MonetizationState> {
  const current = await readStorageKey(STORAGE_KEYS.monetization);
  if (current) return current;

  const legacy = await readStorageKey(STORAGE_KEYS.monetizationLegacy);
  if (legacy) {
    await saveState(legacy);
    await AsyncStorage.removeItem(STORAGE_KEYS.monetizationLegacy);
    return legacy;
  }

  return { ...DEFAULT_STATE };
}

function rewardQuotaAvailable(state: MonetizationState, feature: RewardFeature) {
  const config = FEATURE_LIMITS[feature];
  if (state.rewardedGlobalUsed >= Limits.rewardedGlobalCapPerDay) return false;
  if (config.counter && config.perDay !== null) {
    return state[config.counter] < config.perDay;
  }
  return true;
}

async function incrementRewarded(state: MonetizationState, feature: RewardFeature) {
  const config = FEATURE_LIMITS[feature];
  state.rewardedGlobalUsed += 1;
  if (config.counter) {
    state[config.counter] += 1;
  }
  await saveState(state);
}

export async function canUseRewarded(isPremium: boolean, feature: RewardFeature = 'max_quality') {
  if (isPremium) return true;
  const state = await loadState();
  return rewardQuotaAvailable(state, feature);
}

export async function consumeRewarded(feature: RewardFeature = 'max_quality') {
  const state = await loadState();
  if (!rewardQuotaAvailable(state, feature)) return false;
  await incrementRewarded(state, feature);
  return true;
}

export async function canConvertImgToPdf(isPremium: boolean) {
  if (isPremium) return { freeOk: true, requiresRewarded: false };
  const state = await loadState();
  const freeOk = state.imgToPdfFreeUsed < Limits.imgToPdfFreePerDay;
  return { freeOk, requiresRewarded: !freeOk };
}

export async function recordImgToPdfConversion(isPremium: boolean, usedRewarded: boolean) {
  const state = await loadState();
  if (!isPremium) {
    if (usedRewarded) state.imgToPdfRewardedUsed += 1;
    else state.imgToPdfFreeUsed += 1;
  }
  state.imgToPdfSuccessTotal += 1;
  await saveState(state);

  return {
    shouldShowInterstitial:
      !isPremium &&
      state.imgToPdfSuccessTotal > 1 &&
      state.imgToPdfSuccessTotal % Limits.imgToPdfInterstitialEverySuccesses === 0,
  };
}

export async function shouldShowImgToPdfPaywall(isPremium: boolean) {
  if (isPremium) return false;
  const state = await loadState();
  return state.imgToPdfRewardedUsed >= Limits.imgToPdfPaywallAfterRewarded;
}

export async function canConvertPdfToImages(isPremium: boolean) {
  if (isPremium) return { freeOk: true, requiresRewarded: false };
  const state = await loadState();
  const freeOk = state.pdfToImgFreeUsed < Limits.pdfToImgFreePerDay;
  return { freeOk, requiresRewarded: !freeOk };
}

export async function recordPdfToImagesConversion(isPremium: boolean, usedRewarded: boolean) {
  if (isPremium) return;
  const state = await loadState();
  if (usedRewarded) state.pdfToImgRewardedUsed += 1;
  else state.pdfToImgFreeUsed += 1;
  await saveState(state);
}

export async function shouldShowPdfToImagesPaywall(isPremium: boolean) {
  if (isPremium) return false;
  const state = await loadState();
  return state.pdfToImgRewardedUsed >= Limits.pdfToImgPaywallAfterRewarded;
}

export async function requiresRewardedForMerge(isPremium: boolean) {
  return !isPremium;
}

export async function recordMerge(isPremium: boolean, rewardedWatched: boolean) {
  if (isPremium) return;
  const state = await loadState();
  if (!rewardedWatched) return;
  // mergeRewardedUsed is updated when the rewarded quota is consumed.
  await saveState(state);
}

export async function shouldShowMergePaywall(isPremium = false) {
  if (isPremium) return false;
  const state = await loadState();
  return state.mergeRewardedUsed >= Limits.mergePaywallAfterRewarded;
}

export async function recordPdfView(isPremium: boolean): Promise<{ count: number; shouldShowInterstitial: boolean }> {
  const state = await loadState();
  state.pdfViewsTotal += 1;
  await saveState(state);
  return {
    count: state.pdfViewsTotal,
    shouldShowInterstitial:
      !isPremium && state.pdfViewsTotal > 1 && state.pdfViewsTotal % Limits.interstitialEveryPdfViews === 0,
  };
}

export async function shouldForceInterstitialForPdfView(isPremium: boolean, newCount: number) {
  if (isPremium) return false;
  return newCount > 1 && newCount % Limits.interstitialEveryPdfViews === 0;
}

export async function resetMonetizationState() {
  await AsyncStorage.multiRemove([STORAGE_KEYS.monetization, STORAGE_KEYS.monetizationLegacy]);
}
