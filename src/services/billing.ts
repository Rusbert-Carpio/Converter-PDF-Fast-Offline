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

type PremiumStatus = {
  active: boolean;
  source: 'store' | 'cache';
  checkedAt: number;
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
    purchase?.originalJson?.productId,
    purchase?.originalJson?.productIds?.[0],
    ...(Array.isArray(purchase?.productIds) ? purchase.productIds : []),
  ].filter(Boolean));

  return candidates.some((candidate) => productIds.includes(candidate));
}

function parsePurchaseTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return asNumber;
    const asDate = Date.parse(value);
    if (Number.isFinite(asDate)) return asDate;
  }
  return null;
}

function purchaseLooksExpired(purchase: any) {
  const expiry = parsePurchaseTimestamp(
    purchase?.expirationDate ??
      purchase?.expirationDateIOS ??
      purchase?.expiryTimeMillis ??
      purchase?.expiryDate ??
      purchase?.expiryDateMs ??
      purchase?.expirationDateAndroid,
  );

  if (!expiry) return false;
  return expiry <= Date.now();
}

function purchaseIsPurchasedState(purchase: any) {
  const state = purchase?.purchaseStateAndroid ?? purchase?.purchaseState;
  if (state === undefined || state === null || state === '') return true;
  const normalized = String(state).toLowerCase();
  return normalized === '1' || normalized === 'purchased' || normalized === 'purchasedstate';
}

function isActivePremiumPurchase(purchase: any, productIds: string[]) {
  if (!purchaseMatchesProductId(purchase, productIds)) return false;
  if (!purchaseIsPurchasedState(purchase)) return false;
  if (purchaseLooksExpired(purchase)) return false;
  return true;
}

async function readStorePremiumStatus(productIds: string[]): Promise<boolean> {
  await primeProductsCache();
  const iap = await getIapModule();

  const checks: Array<() => Promise<boolean>> = [];

  if (typeof iap.hasActiveSubscriptions === 'function') {
    checks.push(async () => {
      const result = await iap.hasActiveSubscriptions(productIds);
      return !!result;
    });
  }

  if (typeof iap.getAvailablePurchases === 'function') {
    checks.push(async () => {
      const attempts = [
        undefined,
        { onlyIncludeActiveItems: true },
      ];

      for (const options of attempts) {
        try {
          const purchases = options
            ? await iap.getAvailablePurchases(options)
            : await iap.getAvailablePurchases();

          if (Array.isArray(purchases) && purchases.some((purchase: any) => isActivePremiumPurchase(purchase, productIds))) {
            return true;
          }
        } catch {
          // seguimos con la siguiente estrategia
        }
      }

      return false;
    });
  }

  if (typeof iap.getActiveSubscriptions === 'function') {
    checks.push(async () => {
      const purchases = await iap.getActiveSubscriptions();
      return Array.isArray(purchases) && purchases.some((purchase: any) => isActivePremiumPurchase(purchase, productIds));
    });
  }

  for (const check of checks) {
    try {
      if (await check()) return true;
    } catch {
      // seguimos con la siguiente estrategia
    }
  }

  return false;
}

async function savePremiumCache(active: boolean) {
  await AsyncStorage.setItem(STORAGE_KEY_LAST_PREMIUM, active ? '1' : '0');
}

async function getCachedPremiumStatus(): Promise<PremiumStatus> {
  const active = (await AsyncStorage.getItem(STORAGE_KEY_LAST_PREMIUM)) === '1';
  return { active, source: 'cache', checkedAt: Date.now() };
}

export async function syncPremiumFromStore(): Promise<boolean> {
  const fallback = await getCachedPremiumStatus();
  if (!isNativeStoreSupported()) return fallback.active;

  const productIds = getSubscriptionProductIds();
  if (!productIds.length) return fallback.active;

  try {
    const active = await readStorePremiumStatus(productIds);
    await savePremiumCache(active);
    return active;
  } catch {
    return fallback.active;
  }
}

export async function restorePremiumPurchases(): Promise<boolean> {
  if (!isNativeStoreSupported()) return false;
  const productIds = getSubscriptionProductIds();
  if (!productIds.length) return false;

  const active = await readStorePremiumStatus(productIds);
  await savePremiumCache(active);
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
