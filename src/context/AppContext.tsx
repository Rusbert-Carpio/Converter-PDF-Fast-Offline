import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Appearance, ColorSchemeName } from 'react-native';
import { AppLanguage, translations } from '../i18n/translations';
import { cachePremiumStatus, syncPremiumFromStore } from '../services/billing';
import { STORAGE_KEYS } from '../services/storageKeys';
import { ResolvedTheme, ThemeMode } from '../theme/palettes';


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
        const [premiumRaw, billingPremiumRaw, languageRaw, themeRaw, onboardingRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.isPremium),
          AsyncStorage.getItem(STORAGE_KEYS.billingLastPremium),
          AsyncStorage.getItem(STORAGE_KEYS.language),
          AsyncStorage.getItem(STORAGE_KEYS.themeMode),
          AsyncStorage.getItem(STORAGE_KEYS.languageOnboardingDone),
        ]);

        if (!mounted) return;

        setIsPremiumState(premiumRaw === 'true' || billingPremiumRaw === '1');
        setLanguageState(normalizeLanguage(languageRaw));
        setThemeModeState(normalizeThemeMode(themeRaw));
        setHasCompletedLanguageOnboarding(onboardingRaw === 'true');
      } finally {
        if (mounted) setIsReady(true);
      }

      try {
        const premiumFromStore = await syncPremiumFromStore();
        if (mounted) setIsPremiumState(premiumFromStore);
        await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.isPremium, premiumFromStore ? 'true' : 'false'),
        cachePremiumStatus(premiumFromStore),
      ]);
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
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.isPremium, value ? 'true' : 'false'),
          cachePremiumStatus(value),
        ]);
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
    await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.isPremium, value ? 'true' : 'false'),
          cachePremiumStatus(value),
        ]);
  };

  const refreshPremiumStatus = async () => {
    const value = await syncPremiumFromStore();
    setIsPremiumState(value);
    await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.isPremium, value ? 'true' : 'false'),
          cachePremiumStatus(value),
        ]);
    return value;
  };

  const setLanguage = async (value: AppLanguage) => {
    setLanguageState(value);
    await AsyncStorage.setItem(STORAGE_KEYS.language, value);
  };

  const completeLanguageOnboarding = async (value: AppLanguage) => {
    setLanguageState(value);
    setHasCompletedLanguageOnboarding(true);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.language, value),
      AsyncStorage.setItem(STORAGE_KEYS.languageOnboardingDone, 'true'),
    ]);
  };

  const setThemeMode = async (value: ThemeMode) => {
    setThemeModeState(value);
    await AsyncStorage.setItem(STORAGE_KEYS.themeMode, value);
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
