import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../hooks/useAppTheme";

export default function PremiumButton({ onPress }: { onPress: () => void }) {
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.9 }]}> 
      <View style={styles.inner}>
        <MaterialCommunityIcons name="star-four-points" size={18} color="#FBBF24" />
        <Text style={styles.text}>Premium</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    wrap: {
      height: 46,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    inner: { flexDirection: "row", alignItems: "center", gap: 8 },
    text: { fontSize: 14, fontWeight: "800", color: colors.text },
  });
