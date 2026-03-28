import React, { createContext, useContext, useMemo, useState } from 'react';
import { AD_BANNER_FALLBACK_HEIGHT } from '../services/adPolicy';

type BannerContextValue = {
  bannerHeight: number;
  setBannerHeight: (value: number) => void;
};

const BannerContext = createContext<BannerContextValue | null>(null);

export function BannerProvider({ children }: { children: React.ReactNode }) {
  const [bannerHeight, setBannerHeightState] = useState(AD_BANNER_FALLBACK_HEIGHT);

  const value = useMemo(
    () => ({
      bannerHeight,
      setBannerHeight: (value: number) => {
        if (!Number.isFinite(value) || value <= 0) return;
        setBannerHeightState(Math.round(value));
      },
    }),
    [bannerHeight],
  );

  return <BannerContext.Provider value={value}>{children}</BannerContext.Provider>;
}

export function useBanner() {
  const ctx = useContext(BannerContext);
  if (!ctx) throw new Error('useBanner must be used inside BannerProvider');
  return ctx;
}
