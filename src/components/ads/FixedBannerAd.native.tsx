import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { BannerAd } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { useBanner } from '../../context/BannerContext';
import { getAdUnitIds, ensureAdsInitialized } from '../../services/adConfig';
import { AD_BANNER_FALLBACK_HEIGHT, getAdaptiveBannerSize, shouldShowBannerForRoute } from '../../services/adPolicy';

export const BANNER_HEIGHT = AD_BANNER_FALLBACK_HEIGHT;

export default function FixedBannerAd() {
  const { isPremium } = useApp();
  const { bannerHeight } = useBanner();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const adUnitIds = useMemo(() => getAdUnitIds(), []);
  const canRender = !isPremium && shouldShowBannerForRoute(pathname);

  useEffect(() => {
    if (!canRender) return;
    ensureAdsInitialized().catch(() => {});
  }, [canRender]);

  if (!canRender) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]} pointerEvents="box-none">
      <View style={[styles.bannerBox, { minHeight: bannerHeight }]}> 
        <BannerAd
          unitId={adUnitIds.banner}
          size={getAdaptiveBannerSize() as any}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bannerBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
