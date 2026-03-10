import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Appearance, ColorSchemeName } from 'react-native';
import { AppLanguage, translations } from '../i18n/translations';
import { syncPremiumFromStore } from '../services/billing';
import { ResolvedTheme, ThemeMode } from '../theme/palettes';

const KEY_IS_PREMIUM = 'ameda:isPremium';
const KEY_LANGUAGE = 'ameda:language';
const KEY_THEME_MODE = 'ameda:themeMode';
const KEY_LANGUAGE_ONBOARDING_DONE = 'ameda:languageOnboardingDone';

type TranslationTree = typeof translations.es;
type SectionKey = keyof TranslationTree;
type NestedKey<T> = Extract<keyof T, string>;

type AppContextValue = {
  isReady: boolean;
  isPremium: boolean;
  setIsPremium: (value: boolean) => Promise<void>;
  refreshPremiumStatus: () => Promise<boolean>;
  language: AppLanguage;
  setLanguage: (value: AppLanguage) => Promise<void>;
  hasCompletedLanguageOnboarding: boolean;
  completeLanguageOnboarding: (value: AppLanguage) => Promise<void>;
  themeMode: ThemeMode;
  setThemeMode: (value: ThemeMode) => Promise<void>;
  resolvedTheme: ResolvedTheme;
  t: <S extends SectionKey, K extends NestedKey<TranslationTree[S]>>(section: S, key: K) => TranslationTree[S][K];
};

const AppContext = createContext<AppContextValue | null>(null);

function normalizeLanguage(value: string | null): AppLanguage {
  return value === 'en' ? 'en' : 'es';
}

function normalizeThemeMode(value: string | null): ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

function resolveSystemTheme(colorScheme: ColorSchemeName): ResolvedTheme {
  return colorScheme === 'dark' ? 'dark' : 'light';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isPremium, setIsPremiumState] = useState(false);
  const [language, setLanguageState] = useState<AppLanguage>('es');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(resolveSystemTheme(Appearance.getColorScheme()));
  const [hasCompletedLanguageOnboarding, setHasCompletedLanguageOnboarding] = useState(false);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(resolveSystemTheme(colorScheme));
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [premiumRaw, languageRaw, themeRaw, onboardingRaw] = await Promise.all([
          AsyncStorage.getItem(KEY_IS_PREMIUM),
          AsyncStorage.getItem(KEY_LANGUAGE),
          AsyncStorage.getItem(KEY_THEME_MODE),
          AsyncStorage.getItem(KEY_LANGUAGE_ONBOARDING_DONE),
        ]);

        if (!mounted) return;

        setIsPremiumState(premiumRaw === 'true');
        setLanguageState(normalizeLanguage(languageRaw));
        setThemeModeState(normalizeThemeMode(themeRaw));
        setHasCompletedLanguageOnboarding(onboardingRaw === 'true');
      } finally {
        if (mounted) setIsReady(true);
      }

      try {
        const premiumFromStore = await syncPremiumFromStore();
        if (mounted) setIsPremiumState(premiumFromStore);
        await AsyncStorage.setItem(KEY_IS_PREMIUM, premiumFromStore ? 'true' : 'false');
      } catch {}
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let syncing = false;

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState !== 'active' || syncing) return;
      syncing = true;
      try {
        const value = await syncPremiumFromStore();
        setIsPremiumState(value);
        await AsyncStorage.setItem(KEY_IS_PREMIUM, value ? 'true' : 'false');
      } catch {
      } finally {
        syncing = false;
      }
    });

    return () => subscription.remove();
  }, []);

  const resolvedTheme: ResolvedTheme = themeMode === 'system' ? systemTheme : themeMode;

  const setIsPremium = async (value: boolean) => {
    setIsPremiumState(value);
    await AsyncStorage.setItem(KEY_IS_PREMIUM, value ? 'true' : 'false');
  };

  const refreshPremiumStatus = async () => {
    const value = await syncPremiumFromStore();
    setIsPremiumState(value);
    await AsyncStorage.setItem(KEY_IS_PREMIUM, value ? 'true' : 'false');
    return value;
  };

  const setLanguage = async (value: AppLanguage) => {
    setLanguageState(value);
    await AsyncStorage.setItem(KEY_LANGUAGE, value);
  };

  const completeLanguageOnboarding = async (value: AppLanguage) => {
    setLanguageState(value);
    setHasCompletedLanguageOnboarding(true);
    await Promise.all([
      AsyncStorage.setItem(KEY_LANGUAGE, value),
      AsyncStorage.setItem(KEY_LANGUAGE_ONBOARDING_DONE, 'true'),
    ]);
  };

  const setThemeMode = async (value: ThemeMode) => {
    setThemeModeState(value);
    await AsyncStorage.setItem(KEY_THEME_MODE, value);
  };

  const t = <S extends SectionKey, K extends NestedKey<TranslationTree[S]>>(section: S, key: K): TranslationTree[S][K] => {
    const sectionMap = translations[language][section];
    return sectionMap[key];
  };

  const value = useMemo<AppContextValue>(
    () => ({
      isReady,
      isPremium,
      setIsPremium,
      refreshPremiumStatus,
      language,
      setLanguage,
      hasCompletedLanguageOnboarding,
      completeLanguageOnboarding,
      themeMode,
      setThemeMode,
      resolvedTheme,
      t,
    }),
    [isReady, isPremium, language, hasCompletedLanguageOnboarding, themeMode, resolvedTheme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
