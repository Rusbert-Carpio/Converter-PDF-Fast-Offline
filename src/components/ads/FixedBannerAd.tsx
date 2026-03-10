import React from "react";
import { View, StyleSheet } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../context/AppContext";

// Banner height típico: 50dp (BANNER)
export const BANNER_HEIGHT = 50;

export default function FixedBannerAd() {
  const { isPremium } = useApp();
  const insets = useSafeAreaInsets();

  if (isPremium) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]} pointerEvents="box-none">
      <View style={styles.bannerBox}>
        <BannerAd unitId={TestIds.BANNER} size={BannerAdSize.BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bannerBox: {
    height: BANNER_HEIGHT,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
