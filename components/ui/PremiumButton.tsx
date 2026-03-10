import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";

type Props = { onPress: () => void };

const HEIGHT = 46;

export default function PremiumButton({ onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
      <MaterialCommunityIcons name="sparkles" size={18} color={Colors.primary} />
      <Text style={styles.text}>Premium</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: HEIGHT,
    paddingHorizontal: 16,
    borderRadius: HEIGHT / 2,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  text: { fontSize: 14, fontWeight: "800", color: Colors.text },
});