import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { cachePremiumStatus, syncPremiumFromStore } from '../services/billing';

const KEY = 'ameda_premium_active_v1';

export async function getPremiumActive(): Promise<boolean> {
  try {
    const synced = await syncPremiumFromStore();
    await AsyncStorage.setItem(KEY, synced ? '1' : '0');
    return synced;
  } catch {
    try {
      const v = await AsyncStorage.getItem(KEY);
      return v === '1';
    } catch {
      return false;
    }
  }
}

export async function setPremiumActive(active: boolean): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(KEY, active ? '1' : '0'),
    cachePremiumStatus(active),
  ]);
}

export function usePremium() {
  const [isPremium, setIsPremium] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const v = await getPremiumActive();
    setIsPremium(v);
    setReady(true);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const set = React.useCallback(async (value: boolean) => {
    await setPremiumActive(value);
    setIsPremium(value);
  }, []);

  return { isPremium, ready, refresh, setPremium: set };
}
