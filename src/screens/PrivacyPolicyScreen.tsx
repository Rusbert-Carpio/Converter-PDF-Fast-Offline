import React, { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import Screen from '../components/layout/Screen';
import AppHeader from '../components/layout/AppHeader';
import { useApp } from '../context/AppContext';
import { useAppTheme } from '../hooks/useAppTheme';

const PRIVACY_URL = 'https://sites.google.com/view/privacy-policy-of-converter/inicio';
const SUPPORT_EMAIL = 'amedastudios@gmail.com';
const LAST_UPDATED = '2026-03-12';

export default function PrivacyPolicyScreen() {
  const colors = useAppTheme();
  const { t } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sections = [
    { title: t('privacy', 'section1Title'), body: t('privacy', 'section1Body') },
    { title: t('privacy', 'section2Title'), body: t('privacy', 'section2Body') },
    { title: t('privacy', 'section3Title'), body: t('privacy', 'section3Body') },
    { title: t('privacy', 'section4Title'), body: t('privacy', 'section4Body') },
    { title: t('privacy', 'section5Title'), body: t('privacy', 'section5Body') },
  ];

  return (
    <Screen>
      <AppHeader title={t('privacy', 'title')} onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>{t('privacy', 'title')}</Text>
          <Text style={styles.updated}>{t('privacy', 'updated')}: {LAST_UPDATED}</Text>
          <Text style={styles.intro}>{t('privacy', 'intro')}</Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('privacy', 'fullPolicyTitle')}</Text>
          <Text style={styles.sectionBody}>{t('privacy', 'fullPolicyBody')}</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} style={({ pressed }) => [styles.linkButton, pressed && { opacity: 0.92 }]}>
            <Text style={styles.linkButtonText}>{t('privacy', 'openPolicy')}</Text>
          </Pressable>
          <Text selectable style={styles.linkText}>{PRIVACY_URL}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('privacy', 'contactTitle')}</Text>
          <Text style={styles.sectionBody}>{SUPPORT_EMAIL}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    content: {
      paddingBottom: 24,
      gap: 14,
    },
    heroCard: {
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    title: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.text,
    },
    updated: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
    },
    intro: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 21,
      color: colors.text,
    },
    sectionCard: {
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      gap: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.text,
    },
    sectionBody: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.textMuted,
    },
    linkButton: {
      marginTop: 4,
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    linkButtonText: {
      color: colors.textOnPrimary,
      fontWeight: '800',
    },
    linkText: {
      marginTop: 8,
      color: colors.textMuted,
      fontSize: 12.5,
      lineHeight: 18,
    },
  });
