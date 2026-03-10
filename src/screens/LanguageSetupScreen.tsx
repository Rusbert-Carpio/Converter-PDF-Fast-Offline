import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Screen from '../components/layout/Screen';
import AppButton from '../components/ui/AppButton';
import { useApp } from '../context/AppContext';
import { useAppTheme } from '../hooks/useAppTheme';
import { AppLanguage } from '../i18n/translations';

export default function LanguageSetupScreen() {
  const { completeLanguageOnboarding, language, t } = useApp();
  const colors = useAppTheme();
  const [selected, setSelected] = useState<AppLanguage>(language);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleContinue = async () => {
    await completeLanguageOnboarding(selected);
    router.replace('/home');
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.badge}>Ameda Image to PDF</Text>
        <Text style={styles.title}>{t('onboarding', 'title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding', 'subtitle')}</Text>
        <Text style={styles.helper}>{t('onboarding', 'helper')}</Text>
      </View>

      <View style={styles.options}>
        <LanguageCard label={t('common', 'spanish')} description={t('onboarding', 'spanishDescription')} active={selected === 'es'} onPress={() => setSelected('es')} colors={colors} />
        <LanguageCard label={t('common', 'english')} description={t('onboarding', 'englishDescription')} active={selected === 'en'} onPress={() => setSelected('en')} colors={colors} />
      </View>

      <View style={styles.ctaWrap}>
        <AppButton title={t('common', 'continue')} onPress={handleContinue} style={styles.cta} />
      </View>
    </Screen>
  );
}

function LanguageCard({
  label,
  description,
  active,
  onPress,
  colors,
}: {
  label: string;
  description: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>;
}) {
  return (
    <Pressable onPress={onPress} style={[stylesCard.card, { backgroundColor: colors.surface, borderColor: active ? colors.primary : colors.border }]}> 
      <View style={[stylesCard.dot, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : 'transparent' }]} />
      <View style={{ flex: 1 }}>
        <Text style={[stylesCard.label, { color: colors.text }]}>{label}</Text>
        <Text style={[stylesCard.description, { color: colors.textMuted }]}>{description}</Text>
      </View>
    </Pressable>
  );
}

const stylesCard = StyleSheet.create({
  card: {
    minHeight: 82,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  label: {
    fontSize: 17,
    fontWeight: '800',
  },
  description: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
  },
});

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    screen: {
      justifyContent: 'flex-start',
      paddingTop: 32,
      paddingBottom: 24,
    },
    hero: {
      marginTop: 24,
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: colors.primarySoft,
      color: colors.primary,
      fontWeight: '800',
      fontSize: 12,
      marginBottom: 18,
    },
    title: {
      color: colors.text,
      fontSize: 31,
      fontWeight: '900',
    },
    subtitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
      marginTop: 10,
    },
    helper: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 12,
      maxWidth: 360,
    },
    options: {
      gap: 14,
      marginTop: 28,
    },
    ctaWrap: {
      marginTop: 34,
      paddingBottom: 172,
      justifyContent: 'center',
    },
    cta: {
      alignSelf: 'stretch',
    },
  });
