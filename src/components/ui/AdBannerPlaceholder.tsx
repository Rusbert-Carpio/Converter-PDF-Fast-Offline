import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Colors, Radii, Spacing, Typography } from "../../theme";

type Props = {
  style?: ViewStyle;
};

/**
 * Placeholder visual para un banner AdMob.
 * - Aquí se integra expo-ads-admob o react-native-google-mobile-ads.
 * - NO hardcodeamos IDs reales en este proyecto.
 */
export default function AdBannerPlaceholder({ style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.text}>Espacio para anuncio</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 92,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  text: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: "center",
  },
});
