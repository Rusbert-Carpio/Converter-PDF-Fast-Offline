import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
};

const HEIGHT = 46;

export default function SearchPill({ value, onChangeText, placeholder }: Props) {
  return (
    <View style={styles.wrap}>
      <Feather name="search" size={18} color={Colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? "Buscar"}
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
});