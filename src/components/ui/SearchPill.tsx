import React, { useMemo } from "react";
import { StyleSheet, TextInput, View, TextInputProps } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppTheme } from "../../hooks/useAppTheme";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onFocus?: TextInputProps["onFocus"];
  onBlur?: TextInputProps["onBlur"];
};

const HEIGHT = 46;

export default function SearchPill({ value, onChangeText, placeholder, onFocus, onBlur }: Props) {
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Feather name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder ?? "Buscar"}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        returnKeyType="search"
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    wrap: {
      height: HEIGHT,
      borderRadius: HEIGHT / 2,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
  });
