import React from 'react';
import { SafeAreaView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BANNER_HEIGHT } from '../ads/FixedBannerAd';
import { useApp } from '../../context/AppContext';
import { Spacing } from '../../theme';
import { useAppTheme } from '../../hooks/useAppTheme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export default function Screen({ children, style }: Props) {
  const insets = useSafeAreaInsets();
  const { isPremium } = useApp();
  const colors = useAppTheme();
  const bottomPad = (isPremium ? 0 : BANNER_HEIGHT) + Math.max(insets.bottom, 8);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View style={[styles.container, { paddingBottom: bottomPad }, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
});
