import AsyncStorage from "@react-native-async-storage/async-storage";

export type RewardFeature = "max_quality" | "merge_pdf";

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

const STORAGE_KEY = "amenda_monetization_v3";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

export const Limits = {
  imgToPdfFreePerDay: 2,
  imgToPdfPaywallAfterRewarded: 2,
  pdfToImgFreePerDay: 3,
  pdfToImgPaywallAfterRewarded: 2,
  pdfToImageMaxPagesPerConversionFree: 5,
  mergePaywallAfterRewarded: 2,
  interstitialEveryPdfViews: 2,
  imgToPdfInterstitialEverySuccesses: 4,
  maxQualityPerDayViaRewarded: 2,
  rewardedGlobalCapPerDay: 5,
};

async function loadState(): Promise<MonetizationState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_STATE };
  try {
    const parsed = JSON.parse(raw) as Partial<MonetizationState>;
    if (!parsed?.dateKey || parsed.dateKey !== todayKey()) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function saveState(state: MonetizationState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function canUseRewarded(isPremium: boolean, feature: RewardFeature = "max_quality") {
  if (isPremium) return true;
  const s = await loadState();
  if (feature === "merge_pdf") return true;
  if (s.rewardedGlobalUsed >= Limits.rewardedGlobalCapPerDay) return false;
  if (feature === "max_quality") return s.maxQualityUsed < Limits.maxQualityPerDayViaRewarded;
  return false;
}

export async function consumeRewarded(feature: RewardFeature = "max_quality") {
  const s = await loadState();
  if (feature === "max_quality") {
    s.rewardedGlobalUsed += 1;
    s.maxQualityUsed += 1;
  }
  await saveState(s);
}

export async function canConvertImgToPdf(isPremium: boolean) {
  if (isPremium) return { freeOk: true, requiresRewarded: false };
  const s = await loadState();
  const freeOk = s.imgToPdfFreeUsed < Limits.imgToPdfFreePerDay;
  return { freeOk, requiresRewarded: !freeOk };
}

export async function recordImgToPdfConversion(isPremium: boolean, usedRewarded: boolean) {
  const s = await loadState();
  if (!isPremium) {
    if (usedRewarded) s.imgToPdfRewardedUsed += 1;
    else s.imgToPdfFreeUsed += 1;
  }
  s.imgToPdfSuccessTotal += 1;
  await saveState(s);
  return {
    shouldShowInterstitial: !isPremium && s.imgToPdfSuccessTotal > 1 && s.imgToPdfSuccessTotal % Limits.imgToPdfInterstitialEverySuccesses === 0,
  };
}

export async function shouldShowImgToPdfPaywall(isPremium: boolean) {
  if (isPremium) return false;
  const s = await loadState();
  return s.imgToPdfRewardedUsed >= Limits.imgToPdfPaywallAfterRewarded;
}

export async function canConvertPdfToImages(isPremium: boolean) {
  if (isPremium) return { freeOk: true, requiresRewarded: false };
  const s = await loadState();
  const freeOk = s.pdfToImgFreeUsed < Limits.pdfToImgFreePerDay;
  return { freeOk, requiresRewarded: !freeOk };
}

export async function recordPdfToImagesConversion(isPremium: boolean, usedRewarded: boolean) {
  if (isPremium) return;
  const s = await loadState();
  if (usedRewarded) s.pdfToImgRewardedUsed += 1;
  else s.pdfToImgFreeUsed += 1;
  await saveState(s);
}

export async function shouldShowPdfToImagesPaywall(isPremium: boolean) {
  if (isPremium) return false;
  const s = await loadState();
  return s.pdfToImgRewardedUsed >= Limits.pdfToImgPaywallAfterRewarded;
}

export async function requiresRewardedForMerge(isPremium: boolean) {
  return !isPremium;
}

export async function recordMerge(isPremium: boolean, rewardedWatched: boolean) {
  if (isPremium) return;
  const s = await loadState();
  if (rewardedWatched) s.mergeRewardedUsed += 1;
  await saveState(s);
}

export async function shouldShowMergePaywall(isPremium: boolean) {
  if (isPremium) return false;
  const s = await loadState();
  return s.mergeRewardedUsed >= Limits.mergePaywallAfterRewarded;
}

export async function recordPdfView(isPremium: boolean): Promise<{ count: number; shouldShowInterstitial: boolean }> {
  const s = await loadState();
  s.pdfViewsTotal += 1;
  await saveState(s);
  return {
    count: s.pdfViewsTotal,
    shouldShowInterstitial: !isPremium && s.pdfViewsTotal > 1 && s.pdfViewsTotal % Limits.interstitialEveryPdfViews === 0,
  };
}

export async function shouldForceInterstitialForPdfView(isPremium: boolean, newCount: number) {
  if (isPremium) return false;
  return newCount > 1 && newCount % Limits.interstitialEveryPdfViews === 0;
}

export async function resetMonetizationState() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
