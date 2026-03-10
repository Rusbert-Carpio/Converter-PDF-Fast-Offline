import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ErrorCode, useIAP } from 'react-native-iap';
import { useAppTheme } from '../hooks/useAppTheme';
import { useApp } from '../context/AppContext';
import { useAppAlert } from '../context/AppAlertContext';
import Screen from '../components/layout/Screen';
import AppHeader from '../components/layout/AppHeader';
import {
  BillingPlan,
  cachePremiumStatus,
  fetchSubscriptionPlans,
  getAndroidBillingConfig,
  getSubscriptionProductIds,
  openNativeSubscriptionManagement,
  restorePremiumPurchases,
} from '../services/billing';

function PlanCard({
  tone,
  title,
  price,
  period,
  badge,
  benefits,
  buyLabel,
  onBuy,
  colors,
  disabled,
  loading,
}: {
  tone: 'blue' | 'gold';
  title: string;
  price: string;
  period: string;
  badge?: string;
  benefits: string[];
  buyLabel: string;
  onBuy: () => void;
  colors: ReturnType<typeof useAppTheme>;
  disabled?: boolean;
  loading?: boolean;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isGold = tone === 'gold';
  return (
    <View style={[styles.planCard, isGold ? styles.goldCard : styles.blueCard, disabled && styles.planCardDisabled]}>
      {badge && (
        <View style={[styles.badge, isGold ? styles.badgeGold : styles.badgeBlue]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}

      <Text style={styles.planTitle}>{title}</Text>
      <Text style={styles.planPrice}>{price}<Text style={styles.planPeriod}>/{period}</Text></Text>

      <Pressable onPress={onBuy} disabled={disabled || loading} style={({ pressed }) => [styles.buyBtn, isGold ? styles.buyGold : styles.buyBlue, (disabled || loading) && styles.buyDisabled, pressed && !disabled && !loading && { opacity: 0.9 }]}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buyText}>{buyLabel}</Text>}
      </Pressable>

      <View style={{ height: 10 }} />

      {benefits.map((b, idx) => (
        <View key={idx} style={styles.bRow}>
          <MaterialCommunityIcons name="check-circle" size={18} color={isGold ? '#C08A00' : '#2563EB'} />
          <Text style={styles.bText}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

function resolvePlanByType(plans: BillingPlan[], type: 'monthly' | 'yearly') {
  if (Platform.OS === 'android') {
    const targetBasePlanId = getAndroidBillingConfig().basePlans[type];
    return plans.find((plan) => plan.basePlanId === targetBasePlanId);
  }

  return plans[type === 'monthly' ? 0 : 1] ?? plans[0];
}

function resolveGoogleOffers(plan: BillingPlan | undefined) {
  if (!plan?.offerToken) return undefined;
  return [{ sku: plan.productId, offerToken: plan.offerToken }];
}

function getPurchaseErrorMessage(error: any, t: ReturnType<typeof useApp>['t']) {
  if (error?.code === ErrorCode.UserCancelled) return null;
  if (error?.code === (ErrorCode as any)?.DeferredPayment || error?.code === 'deferred-payment' || error?.code === 'payment-pending') {
    return {
      title: t('plans', 'pendingTitle'),
      body: t('plans', 'pendingBody'),
    };
  }

  return {
    title: t('plans', 'purchaseErrorTitle'),
    body: error?.message || t('plans', 'purchaseErrorBody'),
  };
}

export default function PlansScreen() {
  const colors = useAppTheme();
  const { t, isPremium, setIsPremium, refreshPremiumStatus } = useApp();
  const { showAlert } = useAppAlert();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const productIds = getSubscriptionProductIds();
  const monthlyPlan = resolvePlanByType(plans, 'monthly');
  const yearlyPlan = resolvePlanByType(plans, 'yearly');

  const { connected, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        await finishTransaction({ purchase, isConsumable: false });
      } catch {}

      await cachePremiumStatus(true);
      await setIsPremium(true);
      await refreshPremiumStatus().catch(() => true);
      setBusyPlanId(null);
      showAlert(t('plans', 'purchaseSuccessTitle'), t('plans', 'purchaseSuccessBody'));
    },
    onPurchaseError: (error) => {
      setBusyPlanId(null);
      const message = getPurchaseErrorMessage(error, t);
      if (!message) return;
      showAlert(message.title, message.body);
    },
  });

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoadingPlans(true);
      try {
        const fetched = await fetchSubscriptionPlans();
        if (mounted) setPlans(fetched);
      } catch {
        if (mounted) setPlans([]);
      } finally {
        if (mounted) setLoadingPlans(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!connected || !productIds.length) return;
    fetchProducts({ skus: productIds, type: 'subs' }).catch(() => {});
  }, [connected, fetchProducts, productIds]);

  const buyPlan = async (plan: BillingPlan | undefined) => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      showAlert(t('plans', 'storeUnavailableTitle'), t('plans', 'storeUnavailableBody'));
      return;
    }

    if (!plan?.productId) {
      showAlert(t('plans', 'productsMissingTitle'), t('plans', 'productsMissingBody'));
      return;
    }

    setBusyPlanId(plan.id);

    try {
      await requestPurchase({
        request: {
          apple: { sku: plan.productId },
          google: {
            skus: [plan.productId],
            subscriptionOffers: resolveGoogleOffers(plan),
          },
        },
        type: 'subs',
      });
    } catch (error: any) {
      setBusyPlanId(null);
      const message = getPurchaseErrorMessage(error, t);
      if (!message) return;
      showAlert(message.title, message.body);
    }
  };

  const restore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePremiumPurchases();
      await setIsPremium(restored);
      await cachePremiumStatus(restored);
      await refreshPremiumStatus().catch(() => restored);
      showAlert(
        restored ? t('plans', 'restoreSuccessTitle') : t('plans', 'restoreEmptyTitle'),
        restored ? t('plans', 'restoreSuccessBody') : t('plans', 'restoreEmptyBody'),
      );
    } catch (error: any) {
      showAlert(t('plans', 'restoreErrorTitle'), error?.message || t('plans', 'restoreErrorBody'));
    } finally {
      setRestoring(false);
    }
  };

  const manage = async () => {
    try {
      await openNativeSubscriptionManagement();
    } catch {
      showAlert(t('plans', 'manageTitle'), t('plans', 'manageBody'));
    }
  };

  return (
    <Screen>
      <AppHeader title={t('plans', 'title')} onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>{t('plans', 'heroTitle')}</Text>
        <Text style={styles.h2}>{t('plans', 'heroSubtitle')}</Text>

        {!connected && Platform.OS !== 'web' && (
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="storefront-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>{t('plans', 'connectingStore')}</Text>
          </View>
        )}

        {loadingPlans && (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>{t('plans', 'loadingProducts')}</Text>
          </View>
        )}

        {!loadingPlans && !plans.length && (
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>{t('plans', 'productsMissingBody')}</Text>
          </View>
        )}

        <PlanCard
          tone="blue"
          title={t('plans', 'monthlyTitle')}
          price={monthlyPlan?.displayPrice ?? '$4.99'}
          period={t('plans', 'monthlyPeriod')}
          buyLabel={`${t('plans', 'buyPrefix')} ${monthlyPlan?.displayPrice ?? '$4.99'}/${t('plans', 'monthlyPeriod')}`}
          benefits={[
            t('plans', 'monthlyBenefits1'),
            t('plans', 'monthlyBenefits2'),
            t('plans', 'monthlyBenefits3'),
            t('plans', 'monthlyBenefits4'),
            t('plans', 'monthlyBenefits5'),
          ]}
          onBuy={() => buyPlan(monthlyPlan)}
          colors={colors}
          disabled={busyPlanId !== null || isPremium || !connected || !monthlyPlan}
          loading={busyPlanId === monthlyPlan?.id}
        />

        <PlanCard
          tone="gold"
          title={t('plans', 'yearlyTitle')}
          price={yearlyPlan?.displayPrice ?? '$14.99'}
          period={t('plans', 'yearlyPeriod')}
          badge={t('plans', 'yearlyBadge')}
          buyLabel={`${t('plans', 'buyPrefix')} ${yearlyPlan?.displayPrice ?? '$14.99'}/${t('plans', 'yearlyPeriod')}`}
          benefits={[
            t('plans', 'yearlyBenefits1'),
            t('plans', 'yearlyBenefits2'),
            t('plans', 'yearlyBenefits3'),
          ]}
          onBuy={() => buyPlan(yearlyPlan)}
          colors={colors}
          disabled={busyPlanId !== null || isPremium || !connected || !yearlyPlan}
          loading={busyPlanId === yearlyPlan?.id}
        />

        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>{t('plans', 'storeSectionTitle')}</Text>
          <Text style={styles.actionsSubtitle}>{t('plans', 'storeSectionBody')}</Text>

          <Pressable onPress={restore} disabled={restoring || busyPlanId !== null} style={({ pressed }) => [styles.secondaryBtn, (restoring || busyPlanId !== null) && styles.secondaryBtnDisabled, pressed && !restoring && busyPlanId === null && { opacity: 0.92 }]}>
            {restoring ? <ActivityIndicator color={colors.text} /> : <Text style={styles.secondaryBtnText}>{t('plans', 'restoreButton')}</Text>}
          </Pressable>

          <Pressable onPress={manage} style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.92 }]}> 
            <Text style={styles.secondaryBtnText}>{isPremium ? t('plans', 'manageButtonPremium') : t('plans', 'manageButton')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    content: { paddingBottom: 24, gap: 14 },
    h1: { fontSize: 22, fontWeight: '900', color: colors.text },
    h2: { marginTop: -8, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    loadingCard: {
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      gap: 10,
    },
    loadingText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    infoCard: {
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSoft,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    infoText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.text },
    planCard: {
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    planCardDisabled: { opacity: 0.88 },
    blueCard: { backgroundColor: colors.surface, borderColor: colors.border },
    goldCard: { backgroundColor: colors.surface, borderColor: colors.border },
    badge: {
      position: 'absolute',
      top: 12,
      right: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    badgeBlue: { backgroundColor: 'rgba(37,99,235,0.12)' },
    badgeGold: { backgroundColor: 'rgba(192,138,0,0.16)' },
    badgeText: { fontSize: 12, fontWeight: '900', color: colors.text },
    planTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
    planPrice: { marginTop: 6, fontSize: 28, fontWeight: '900', color: colors.text },
    planPeriod: { fontSize: 14, fontWeight: '800', color: colors.textMuted },
    buyBtn: { marginTop: 12, borderRadius: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
    buyBlue: { backgroundColor: '#2563EB' },
    buyGold: { backgroundColor: '#C08A00' },
    buyDisabled: { opacity: 0.6 },
    buyText: { color: '#FFF', fontWeight: '900' },
    bRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
    bText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
    actionsCard: {
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      gap: 10,
    },
    actionsTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
    actionsSubtitle: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
    secondaryBtn: {
      minHeight: 48,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 14,
    },
    secondaryBtnDisabled: { opacity: 0.65 },
    secondaryBtnText: { fontSize: 14, fontWeight: '900', color: colors.text },
  });
