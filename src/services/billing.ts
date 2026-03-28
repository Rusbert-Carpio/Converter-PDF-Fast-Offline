import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { STORAGE_KEYS } from './storageKeys';

const STORAGE_KEY_LAST_PREMIUM = STORAGE_KEYS.billingLastPremium;
const DEFAULT_ANDROID_PRODUCT_ID = 'premium_subscription';
const DEFAULT_ANDROID_BASE_PLANS = {
  monthly: 'premium-monthly',
  yearly: 'premium-yearly',
} as const;

type BillingExtra = {
  android?: {
    productId?: string;
    basePlans?: {
      monthly?: string;
      yearly?: string;
    };
  };
  iosSkus?: string[];
};

export type BillingPlan = {
  id: string;
  productId: string;
  title: string;
  description?: string;
  displayPrice?: string;
  offerToken?: string;
  basePlanId?: string;
  raw: any;
};

let initPromise: Promise<boolean> | null = null;

function isNativeStoreSupported() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function getExtraBillingConfig(): BillingExtra {
  return ((Constants.expoConfig?.extra as any)?.billing ?? {}) as BillingExtra;
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter((value) => typeof value === 'string' && value.length > 0)));
}

export function getAndroidBillingConfig() {
  const extra = getExtraBillingConfig();
  return {
    productId: extra.android?.productId || DEFAULT_ANDROID_PRODUCT_ID,
    basePlans: {
      monthly: extra.android?.basePlans?.monthly || DEFAULT_ANDROID_BASE_PLANS.monthly,
      yearly: extra.android?.basePlans?.yearly || DEFAULT_ANDROID_BASE_PLANS.yearly,
    },
  };
}

export function getIosSubscriptionSkus(): string[] {
  const extra = getExtraBillingConfig();
  return Array.isArray(extra.iosSkus) ? uniq(extra.iosSkus) : [];
}

export function getSubscriptionProductIds(): string[] {
  if (Platform.OS === 'android') {
    return [getAndroidBillingConfig().productId];
  }
  return getIosSubscriptionSkus();
}

async function getIapModule(): Promise<any> {
  return import('react-native-iap');
}

export async function ensureBillingConnection(): Promise<boolean> {
  if (!isNativeStoreSupported()) return false;
  if (!initPromise) {
    initPromise = (async () => {
      const iap = await getIapModule();
      return !!(await iap.initConnection());
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

export async function endBillingConnection(): Promise<void> {
  if (!initPromise) return;
  try {
    const iap = await getIapModule();
    await iap.endConnection();
  } finally {
    initPromise = null;
  }
}

function getAndroidOfferDisplayPrice(offer: any, fallback?: string) {
  const phases = Array.isArray(offer?.pricingPhases?.pricingPhaseList)
    ? offer.pricingPhases.pricingPhaseList
    : [];
  const lastPhase = phases.length ? phases[phases.length - 1] : undefined;
  return lastPhase?.formattedPrice || offer?.pricingPhases?.formattedPrice || fallback;
}

function normalizePlan(product: any): BillingPlan[] {
  const productId = product?.id ?? product?.productId ?? '';
  if (!productId) return [];

  if (Platform.OS === 'android') {
    const { basePlans } = getAndroidBillingConfig();
    const allowedBasePlanIds = uniq([basePlans.monthly, basePlans.yearly]);
    const offers = Array.isArray(product?.subscriptionOfferDetailsAndroid)
      ? product.subscriptionOfferDetailsAndroid
      : [];

    const matchedOffers = offers.filter((item: any) => {
      const basePlanId = item?.basePlanId;
      return typeof basePlanId === 'string' && allowedBasePlanIds.includes(basePlanId);
    });

    return matchedOffers.map((offer: any) => ({
      id: `${productId}:${offer.basePlanId}`,
      productId,
      title: product?.title ?? '',
      description: product?.description ?? '',
      displayPrice: getAndroidOfferDisplayPrice(offer, product?.displayPrice ?? product?.localizedPrice ?? product?.price),
      offerToken: offer?.offerToken,
      basePlanId: offer?.basePlanId,
      raw: product,
    }));
  }

  return [
    {
      id: productId,
      productId,
      title: product?.title ?? '',
      description: product?.description ?? '',
      displayPrice: product?.displayPrice ?? product?.localizedPrice ?? product?.price,
      raw: product,
    },
  ];
}

async function primeProductsCache(): Promise<void> {
  if (!isNativeStoreSupported()) return;
  const productIds = getSubscriptionProductIds();
  if (!productIds.length) return;
  await ensureBillingConnection();
  const iap = await getIapModule();
  if (typeof iap.fetchProducts === 'function') {
    await iap.fetchProducts({
      skus: productIds,
      type: 'subs',
    });
  }
}

export async function fetchSubscriptionPlans(): Promise<BillingPlan[]> {
  if (!isNativeStoreSupported()) return [];
  const productIds = getSubscriptionProductIds();
  if (!productIds.length) return [];

  await primeProductsCache();
  const iap = await getIapModule();
  const products = await iap.fetchProducts({
    skus: productIds,
    type: 'subs',
  });

  return Array.isArray(products)
    ? products.flatMap((product: any) => normalizePlan(product)).filter((item) => !!item.id)
    : [];
}

function purchaseMatchesProductId(purchase: any, productIds: string[]) {
  const candidates = uniq([
    purchase?.productId,
    purchase?.id,
    ...(Array.isArray(purchase?.productIds) ? purchase.productIds : []),
  ].filter(Boolean));

  return candidates.some((candidate) => productIds.includes(candidate));
}

export async function syncPremiumFromStore(): Promise<boolean> {
  const fallback = (await AsyncStorage.getItem(STORAGE_KEY_LAST_PREMIUM)) === '1';
  if (!isNativeStoreSupported()) return fallback;

  const productIds = getSubscriptionProductIds();
  if (!productIds.length) return fallback;

  try {
    await primeProductsCache();
    const iap = await getIapModule();
    let active = false;

    if (typeof iap.hasActiveSubscriptions === 'function') {
      active = await iap.hasActiveSubscriptions(productIds);
    }

    if (!active && typeof iap.getAvailablePurchases === 'function') {
      const purchases = await iap.getAvailablePurchases();
      active = Array.isArray(purchases) && purchases.some((purchase: any) => purchaseMatchesProductId(purchase, productIds));
    }

    await AsyncStorage.setItem(STORAGE_KEY_LAST_PREMIUM, active ? '1' : '0');
    return active;
  } catch {
    return fallback;
  }
}

export async function restorePremiumPurchases(): Promise<boolean> {
  if (!isNativeStoreSupported()) return false;
  const productIds = getSubscriptionProductIds();
  if (!productIds.length) return false;

  await primeProductsCache();
  const iap = await getIapModule();
  const purchases = await iap.getAvailablePurchases();
  const active = Array.isArray(purchases) && purchases.some((purchase: any) => purchaseMatchesProductId(purchase, productIds));
  await AsyncStorage.setItem(STORAGE_KEY_LAST_PREMIUM, active ? '1' : '0');
  return active;
}

export async function cachePremiumStatus(active: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_LAST_PREMIUM, active ? '1' : '0');
}

export async function openNativeSubscriptionManagement(): Promise<void> {
  if (!isNativeStoreSupported()) return;
  const productIds = getSubscriptionProductIds();
  if (!productIds.length) return;

  await ensureBillingConnection();
  const iap = await getIapModule();
  if (typeof iap.deepLinkToSubscriptions === 'function') {
    await iap.deepLinkToSubscriptions({ skuAndroid: productIds[0] });
  }
}

export function getBillingConfigSummary() {
  const android = getAndroidBillingConfig();
  return {
    android,
    iosSkus: getIosSubscriptionSkus(),
  };
}
