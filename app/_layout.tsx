import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar, View, StyleSheet } from 'react-native';
import FixedBannerAd from '../src/components/ads/FixedBannerAd';
import { AppProvider, useApp } from '../src/context/AppContext';
import { AppAlertProvider } from '../src/context/AppAlertContext';
import { BannerProvider } from '../src/context/BannerContext';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useAppTheme } from '../src/hooks/useAppTheme';
import { ensureAdsInitialized } from '../src/services/adConfig';
import { warmUpAds } from '../src/services/ads';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppShell() {
  const colors = useAppTheme();
  const { resolvedTheme } = useApp();

  useEffect(() => {
    ensureAdsInitialized().catch(() => {});
    warmUpAds().catch(() => {});
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}> 
      <StatusBar barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="premium" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="plans" options={{ presentation: 'modal' }} />
        <Stack.Screen name="pdf-viewer" options={{ presentation: 'card' }} />
      </Stack>
      <FixedBannerAd />
    </View>
  );
}

export default function Layout() {
  const [fontsLoaded] = useFonts(MaterialCommunityIcons.font);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AppProvider>
      <AppAlertProvider>
        <BannerProvider>
          <AppShell />
        </BannerProvider>
      </AppAlertProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
