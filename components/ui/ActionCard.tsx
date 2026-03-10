import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../../theme/colors";

type Props = {
  title: string;
  subtitle: string;
  leftIcon: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress: () => void;
  variant?: "wide" | "half";
};

export default function ActionCard({ title, subtitle, leftIcon, rightIcon, onPress, variant = "half" }: Props) {
  const isWide = variant === "wide";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isWide ? styles.wide : styles.half,
        pressed && { transform: [{ scale: 0.99 }], opacity: 0.98 },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.iconPill}>{leftIcon}</View>
        {!!rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  wide: { width: "100%" },
  half: { flex: 1 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rightIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { marginTop: 12, fontSize: 18, fontWeight: "900", color: Colors.text },
  subtitle: { marginTop: 6, fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
});