import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Screen from '../components/layout/Screen';
import AppHeader from '../components/layout/AppHeader';
import { safeBack } from '../utils/nav';
import { useApp } from '../context/AppContext';
import { useAppTheme } from '../hooks/useAppTheme';
import { ThemeMode } from '../theme/palettes';

export default function SettingsScreen() {
  const { language, setLanguage, themeMode, setThemeMode, t } = useApp();
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Screen>
      <AppHeader title={t('settings', 'title')} onBackPress={() => safeBack('/home')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>{t('settings', 'subtitle')}</Text>

        <SectionCard title={t('settings', 'languageTitle')} subtitle={t('settings', 'languageSubtitle')} colors={colors}>
          <Text style={styles.sectionMeta}>{t('settings', 'currentLanguage')}: {language === 'es' ? t('common', 'spanish') : t('common', 'english')}</Text>
          <View style={styles.segmentRow}>
            <SegmentOption label={t('common', 'spanish')} active={language === 'es'} onPress={() => setLanguage('es')} colors={colors} />
            <SegmentOption label={t('common', 'english')} active={language === 'en'} onPress={() => setLanguage('en')} colors={colors} />
          </View>
        </SectionCard>

        <SectionCard title={t('settings', 'themeTitle')} subtitle={t('settings', 'themeSubtitle')} colors={colors}>
          <Text style={styles.sectionMeta}>{t('settings', 'currentTheme')}: {themeLabel(themeMode, t)}</Text>
          <View style={styles.themeStack}>
            {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
              <Pressable key={mode} onPress={() => setThemeMode(mode)} style={[styles.themeOption, themeMode === mode && styles.themeOptionActive]}>
                <View>
                  <Text style={styles.themeOptionTitle}>{themeLabel(mode, t)}</Text>
                </View>
                <Ionicons name={themeMode === mode ? 'radio-button-on' : 'radio-button-off'} size={20} color={themeMode === mode ? colors.primary : colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </SectionCard>

        <SectionCard title={t('settings', 'privacyTitle')} subtitle={t('settings', 'privacySubtitle')} colors={colors}>
          <Pressable style={styles.linkRow} onPress={() => router.push('/privacy-policy')}>
            <View style={styles.linkLeft}>
              <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.primary} />
              <Text style={styles.linkText}>{t('common', 'privacyPolicy')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </SectionCard>
      </ScrollView>
    </Screen>
  );
}

function SectionCard({ title, subtitle, children, colors }: { title: string; subtitle: string; children: React.ReactNode; colors: ReturnType<typeof useAppTheme> }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function SegmentOption({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: ReturnType<typeof useAppTheme> }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function themeLabel(mode: ThemeMode, t: ReturnType<typeof useApp>['t']) {
  if (mode === 'light') return t('common', 'light');
  if (mode === 'dark') return t('common', 'dark');
  return t('common', 'system');
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    content: {
      gap: 14,
      paddingBottom: 20,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 2,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 22,
      padding: 18,
      shadowColor: colors.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '900',
    },
    cardSubtitle: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 6,
    },
    cardBody: {
      marginTop: 16,
      gap: 12,
    },
    sectionMeta: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    segmentRow: {
      flexDirection: 'row',
      gap: 10,
    },
    segment: {
      flex: 1,
      minHeight: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    segmentActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    segmentText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    segmentTextActive: {
      color: colors.primary,
    },
    themeStack: {
      gap: 10,
    },
    themeOption: {
      minHeight: 50,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    themeOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    themeOptionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    linkRow: {
      minHeight: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    linkLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    linkText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
  });
