import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { Radii, Spacing, Typography } from "../../theme";
import { useAppTheme } from "../../hooks/useAppTheme";

type Variant = "primary" | "secondary" | "ghost";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  style?: ViewStyle;
};

export default function AppButton({ title, onPress, disabled, variant = "primary", style }: Props) {
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const stylesByVariant: Record<Variant, ViewStyle> = {
    primary: { backgroundColor: colors.card },
    secondary: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ghost: { backgroundColor: "transparent" },
  };
  const textByVariant: Record<Variant, any> = {
    primary: { color: colors.textOnCard },
    secondary: { color: colors.text },
    ghost: { color: colors.text },
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        stylesByVariant[variant],
        disabled && styles.disabled,
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}
    >
      <Text style={[styles.text, textByVariant[variant]]}>{title}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    base: {
      borderRadius: Radii.pill,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { opacity: 0.92 },
    disabled: { opacity: 0.55 },
    text: {
      ...Typography.body,
      letterSpacing: 0.2,
    },
  });
