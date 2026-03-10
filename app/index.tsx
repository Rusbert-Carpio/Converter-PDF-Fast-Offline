import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { useAppTheme } from '../src/hooks/useAppTheme';

export default function IndexScreen() {
  const { isReady, hasCompletedLanguageOnboarding } = useApp();
  const colors = useAppTheme();

  useEffect(() => {
    if (!isReady) return;
    router.replace(hasCompletedLanguageOnboarding ? '/home' : '/language-setup');
  }, [isReady, hasCompletedLanguageOnboarding]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
