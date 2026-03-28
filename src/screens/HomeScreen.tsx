import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Keyboard, Image, Animated, Easing, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '../components/layout/Screen';
import ActionCard from '../components/ui/ActionCard';
import SearchPill from '../components/ui/SearchPill';
import PremiumButton from '../components/ui/PremiumButton';
import PremiumActionCard from '../components/ui/PremiumActionCard';
import { searchPdfHistory, PdfHistoryItem } from '../storage/pdfHistory';
import { useApp } from '../context/AppContext';
import { useAppTheme } from '../hooks/useAppTheme';

const LIGHT_MODE_LOGO = require('../../assets/images/home-logo-light.png');
const DARK_MODE_LOGO = require('../../assets/images/home-logo-dark.png');

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PdfHistoryItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const { t, resolvedTheme } = useApp();
  const { height, width } = useWindowDimensions();
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoShift = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    let alive = true;
    (async () => {
      const items = await searchPdfHistory(query);
      if (alive) setResults(items.slice(0, 8));
    })();
    return () => {
      alive = false;
    };
  }, [query]);

  useEffect(() => {
    logoFade.setValue(0);
    logoShift.setValue(8);
    Animated.parallel([
      Animated.timing(logoFade, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoShift, {
        toValue: 0,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [resolvedTheme, logoFade, logoShift]);

  const onPickResult = (item: PdfHistoryItem) => {
    Keyboard.dismiss();
    setShowDropdown(false);
    router.push({ pathname: '/pdf-viewer', params: { uri: item.uri, name: item.name } });
  };

  const homeLogo = resolvedTheme === 'dark' ? DARK_MODE_LOGO : LIGHT_MODE_LOGO;
  const isShort = height <= 780;
  const isVeryShort = height <= 730;
  const isNarrow = width <= 360;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.push('/settings')} style={styles.iconButton}>
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </Pressable>

        <View style={styles.brandBadge}>
          <MaterialCommunityIcons name="file-pdf-box" size={16} color={colors.textOnPrimary} />
          <Text style={styles.brandBadgeText}>PDF Tools</Text>
        </View>
      </View>

      <View style={[styles.hero, isShort && styles.heroTight, isVeryShort && styles.heroVeryTight]}>
        <Animated.View
          style={[
            styles.logoShell,
            isShort && styles.logoShellTight,
            isVeryShort && styles.logoShellVeryTight,
            {
              opacity: logoFade,
              transform: [{ translateY: logoShift }],
            },
          ]}
        >
          <Image source={homeLogo} style={styles.logoImage} resizeMode="contain" fadeDuration={0} />
        </Animated.View>
        <Text style={[styles.heroSubtitle, isShort && styles.heroSubtitleTight]}>{t('home', 'subtitle')}</Text>
      </View>

      <View style={[styles.row, isShort && styles.rowTight]}>
        <View style={{ flex: 1 }}>
          <SearchPill
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              setShowDropdown(true);
            }}
            placeholder={t('home', 'searchPlaceholder')}
            onFocus={() => setShowDropdown(true)}
          />

          {showDropdown && results.length > 0 && (
            <>
              <Pressable
                style={styles.backdrop}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowDropdown(false);
                }}
              />

              <View style={styles.dropdown}>
                <FlatList
                  data={results}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable onPress={() => onPickResult(item)} style={({ pressed }) => [styles.dropItem, pressed && { opacity: 0.85 }]}>
                      <MaterialCommunityIcons name="file-pdf-box" size={18} color={colors.primary} />
                      <Text style={styles.dropText} numberOfLines={1}>{item.name}</Text>
                    </Pressable>
                  )}
                />
              </View>
            </>
          )}
        </View>

        <PremiumButton onPress={() => router.push('/premium')} />
      </View>

      <View style={[styles.cardsWrap, isShort && styles.cardsWrapTight]}>
        <View style={[styles.mainGrid, isNarrow && styles.mainGridNarrow]}>
          <ActionCard
            variant="hero"
            tone="coral"
            title={t('home', 'imageToPdfTitle')}
            subtitle={t('home', 'imageToPdfSubtitle')}
            leftIconName="image-multiple"
            rightIconName="file-pdf-box"
            onPress={() => router.push('/images-to-pdf')}
            style={[styles.heroCard, isShort && styles.heroCardTight, isVeryShort && styles.heroCardVeryTight]}
            density={isShort ? 'tight' : 'regular'}
            titleLines={2}
          />

          <View style={[styles.sideColumn, isShort && styles.sideColumnTight]}>
            <ActionCard
              variant="compact"
              tone="blue"
              title={t('home', 'myPdfsTitle')}
              leftIconName="folder-multiple-outline"
              onPress={() => router.push('/my-pdfs')}
              density={isShort ? 'tight' : 'regular'}
            />

            <ActionCard
              variant="compact"
              tone="amber"
              title={t('home', 'pdfToImageTitle')}
              leftIconName="file-pdf-box"
              onPress={() => router.push('/pdf-to-image')}
              density={isShort ? 'tight' : 'regular'}
            />
          </View>
        </View>

        <PremiumActionCard
          title={t('home', 'mergeTitle')}
          subtitle={t('home', 'mergeSubtitle')}
          onPress={() => router.push('/merge-pdfs')}
          density={isShort ? 'tight' : 'regular'}
          style={[styles.mergeCard, isShort && styles.mergeCardTight]}
        />
      </View>
    </Screen>
  );
}

const PILL_H = 46;
const LOGO_ASPECT_RATIO = 1400 / 933;

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    brandBadgeText: {
      color: colors.textOnPrimary,
      fontWeight: '800',
      fontSize: 12,
    },
    hero: {
      marginBottom: 8,
      alignItems: 'center',
      marginTop: -40,
    },
    heroTight: {
      marginBottom: 4,
      marginTop: -54,
    },
    heroVeryTight: {
      marginBottom: 4,
      marginTop: -54,
    },
    logoShell: {
      width: '100%',
      maxWidth: 300,
      aspectRatio: LOGO_ASPECT_RATIO,
      alignSelf: 'center',
      marginBottom: -12,
    },
    logoShellTight: {
      maxWidth: 252,
      marginBottom: -18,
    },
    logoShellVeryTight: {
      maxWidth: 230,
      marginBottom: -24,
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    heroSubtitle: {
      marginTop: -8,
      fontSize: 13.5,
      lineHeight: 20,
      color: colors.textMuted,
      fontWeight: '700',
      textAlign: 'center',
      maxWidth: 340,
    },
    heroSubtitleTight: {
      marginTop: -12,
      fontSize: 12.5,
      lineHeight: 18,
    },
    row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    rowTight: {
      gap: 8,
    },
    cardsWrap: {
      marginTop: 6,
      gap: 8,
    },
    cardsWrapTight: {
      marginTop: 4,
      gap: 8,
    },
    mainGrid: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'stretch',
    },
    mainGridNarrow: {
      gap: 8,
    },
    heroCard: {
      flex: 1.06,
      minHeight: 0,
    },
    heroCardTight: {
      flex: 1.02,
      minHeight: 0,
    },
    heroCardVeryTight: {
      flex: 1,
    },
    sideColumn: {
      flex: 0.94,
      gap: 8,
    },
    sideColumnTight: {
      gap: 8,
    },
    mergeCard: {
      minHeight: 118,
    },
    mergeCardTight: {
      minHeight: 100,
    },
    dropdown: {
      position: 'absolute',
      top: PILL_H + 10,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      overflow: 'hidden',
      zIndex: 50,
      elevation: 5,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 40,
    },
    dropItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    dropText: { flex: 1, color: colors.text, fontWeight: '700' },
  });
