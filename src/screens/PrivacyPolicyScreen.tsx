import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/layout/Screen';
import AppHeader from '../components/layout/AppHeader';
import { safeBack } from '../utils/nav';
import { useApp } from '../context/AppContext';
import { useAppTheme } from '../hooks/useAppTheme';

export default function PrivacyPolicyScreen() {
  const { t } = useApp();
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Screen>
      <AppHeader title={t('privacy', 'title')} onBackPress={() => safeBack('/settings')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.updated}>{t('privacy', 'updated')}: 2026-03-06</Text>
          <Text style={styles.intro}>{t('privacy', 'intro')}</Text>
        </View>

        <PolicySection title={t('privacy', 'section1Title')} body={t('privacy', 'section1Body')} colors={colors} />
        <PolicySection title={t('privacy', 'section2Title')} body={t('privacy', 'section2Body')} colors={colors} />
        <PolicySection title={t('privacy', 'section3Title')} body={t('privacy', 'section3Body')} colors={colors} />
        <PolicySection title={t('privacy', 'section4Title')} body={t('privacy', 'section4Body')} colors={colors} />
        <PolicySection title={t('privacy', 'section5Title')} body={t('privacy', 'section5Body')} colors={colors} />
      </ScrollView>
    </Screen>
  );
}

function PolicySection({ title, body, colors }: { title: string; body: string; colors: ReturnType<typeof useAppTheme> }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    content: {
      gap: 14,
      paddingBottom: 18,
    },
    hero: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 18,
    },
    updated: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '900',
      marginBottom: 10,
    },
    intro: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 22,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 18,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
      marginBottom: 8,
    },
    cardBody: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 22,
    },
  });
