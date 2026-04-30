import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './storageKeys';

export type RewardFeature = 'max_quality' | 'merge_pdf' | 'img_to_pdf_unlock' | 'pdf_to_image_unlock';
export type FullscreenSource = 'pdf_viewer' | 'img_to_pdf' | 'general';

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
  lastFullscreenAt: number | null;
  lastPdfViewerInterstitialAt: number | null;
  pdfViewerSessionOpens: number;
  imgToPdfInterstitialShownThisSession: boolean;
  sessionStartedAt: number | null;
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
  fullscreenMinGapMs: 120000,
  pdfViewerInterstitialCooldownMs: 180000,
  imgToPdfInterstitialFromFirstSuccess: true,
  pdfToImageRewardedRequiredFromFirstUse: true,
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
  lastFullscreenAt: null,
  lastPdfViewerInterstitialAt: null,
  pdfViewerSessionOpens: 0,
  imgToPdfInterstitialShownThisSession: false,
  sessionStartedAt: null,
};

function getNow() {
  return Date.now();
}

function normalizeState(input: Partial<MonetizationState> | null | undefined): MonetizationState {
  if (!input?.dateKey || input.dateKey !== todayKey()) return { ...DEFAULT_STATE };
  const normalized: MonetizationState = {
    ...DEFAULT_STATE,
    ...input,
    dateKey: input.dateKey,
  };

  if (!normalized.sessionStartedAt) {
    normalized.sessionStartedAt = getNow();
  }

  return normalized;
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

  return { ...DEFAULT_STATE, sessionStartedAt: getNow() };
}

function rewardQuotaAvailable(state: MonetizationState, feature: RewardFeature) {
  const config = FEATURE_LIMITS[feature];

  // Conversion unlocks must remain unlimited for free users as long as they
  // complete the required ad. We intentionally skip the global rewarded cap
  // and any per-day quota for these two features.
  if (feature === 'img_to_pdf_unlock' || feature === 'pdf_to_image_unlock') {
    return true;
  }

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

function canShowFullscreen(state: MonetizationState, isPremium: boolean) {
  if (isPremium) return false;
  if (!state.lastFullscreenAt) return true;
  return getNow() - state.lastFullscreenAt >= Limits.fullscreenMinGapMs;
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
  return { freeOk: false, requiresRewarded: true };
}

export async function recordImgToPdfConversion(isPremium: boolean, usedRewarded: boolean) {
  const state = await loadState();
  if (!isPremium) {
    if (usedRewarded) state.imgToPdfRewardedUsed += 1;
    else state.imgToPdfFreeUsed += 1;
  }
  state.imgToPdfSuccessTotal += 1;

  const shouldShowInterstitial = false;

  await saveState(state);

  return {
    shouldShowInterstitial,
  };
}

export async function shouldShowImgToPdfPaywall(isPremium: boolean) {
  // Image → PDF remains unlimited for free users while they keep watching the
  // required ad for each conversion.
  return false;
}

export async function canConvertPdfToImages(isPremium: boolean) {
  if (isPremium) return { freeOk: true, requiresRewarded: false };
  if (Limits.pdfToImageRewardedRequiredFromFirstUse) {
    return { freeOk: false, requiresRewarded: true };
  }
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
  // PDF → Images also remains unlimited for free users while they keep
  // completing the required rewarded ad for each conversion.
  return false;
}

export async function requiresRewardedForMerge(isPremium: boolean) {
  return !isPremium;
}

export async function recordMerge(isPremium: boolean, rewardedWatched: boolean) {
  if (isPremium) return;
  const state = await loadState();
  if (!rewardedWatched) return;
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
  state.pdfViewerSessionOpens += 1;

  const shouldShowInterstitial = !isPremium;

  await saveState(state);
  return {
    count: state.pdfViewsTotal,
    shouldShowInterstitial,
  };
}

export async function shouldForceInterstitialForPdfView(isPremium: boolean, _newCount: number) {
  return !isPremium;
}

export async function recordFullscreenShown(source: FullscreenSource = 'general') {
  const state = await loadState();
  const now = getNow();
  state.lastFullscreenAt = now;

  if (source === 'pdf_viewer') {
    state.lastPdfViewerInterstitialAt = now;
  }

  if (source === 'img_to_pdf') {
    state.imgToPdfInterstitialShownThisSession = true;
  }

  await saveState(state);
}

export async function getMonetizationDebugSnapshot() {
  return loadState();
}

export async function resetMonetizationState() {
  await AsyncStorage.multiRemove([STORAGE_KEYS.monetization, STORAGE_KEYS.monetizationLegacy]);
}
